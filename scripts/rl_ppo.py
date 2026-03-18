import argparse
import json

from rl_common import (
    DEFAULT_ACTIONS,
    FEATURES,
    NORMS,
    is_terminal_transition,
    load_transitions,
    reward_from_transition,
    vec_from_state,
)


def transition_tick(tr):
    raw = tr.get("t")
    if raw is None:
        raw = (tr.get("s") or {}).get("tick")
    try:
        return int(raw)
    except Exception:
        return None


def build_rollouts(transitions, action_index):
    rows = []
    episode_ranges = []
    start = 0
    prev_tick = None

    for tr in transitions:
        tick = transition_tick(tr)
        if rows and tick is not None and prev_tick is not None and tick < prev_tick:
            episode_ranges.append((start, len(rows)))
            start = len(rows)

        action_name = tr.get("a", "noop")
        action_idx = action_index.get(action_name, action_index.get("noop", 0))
        rows.append(
            {
                "state": vec_from_state(tr.get("s", {})),
                "action": action_idx,
                "reward": reward_from_transition(tr),
                "done": 1.0 if is_terminal_transition(tr) else 0.0,
            }
        )

        prev_tick = tick
        if rows[-1]["done"] > 0.5:
            episode_ranges.append((start, len(rows)))
            start = len(rows)
            prev_tick = None

    if start < len(rows):
        episode_ranges.append((start, len(rows)))

    return rows, episode_ranges


def compute_gae(values, rewards, dones, episode_ranges, gamma, gae_lambda):
    advantages = [0.0] * len(rewards)
    returns = [0.0] * len(rewards)

    for start, end in episode_ranges:
        gae = 0.0
        next_value = 0.0
        next_non_terminal = 0.0
        for idx in range(end - 1, start - 1, -1):
            if idx < end - 1 and dones[idx] < 0.5:
                next_value = values[idx + 1]
                next_non_terminal = 1.0
            else:
                next_value = 0.0
                next_non_terminal = 0.0

            delta = rewards[idx] + gamma * next_value * next_non_terminal - values[idx]
            gae = delta + gamma * gae_lambda * next_non_terminal * gae
            advantages[idx] = gae
            returns[idx] = gae + values[idx]

    return advantages, returns


def main():
    parser = argparse.ArgumentParser(description="Offline PPO-style actor-critic trainer for Mindustry RL logs.")
    parser.add_argument("--log", default="mindustry.log", help="Path to Mindustry log or socket log.")
    parser.add_argument("--out", default="ppo_model.pt", help="Output checkpoint path.")
    parser.add_argument("--out-meta", default="ppo_meta.json", help="Output metadata path.")
    parser.add_argument("--epochs", type=int, default=12, help="Number of PPO update epochs.")
    parser.add_argument("--batch", type=int, default=64, help="Mini-batch size.")
    parser.add_argument("--gamma", type=float, default=0.98, help="Discount factor.")
    parser.add_argument("--gae-lambda", type=float, default=0.95, help="GAE lambda.")
    parser.add_argument("--clip-ratio", type=float, default=0.2, help="PPO clip ratio.")
    parser.add_argument("--value-coef", type=float, default=0.5, help="Value loss coefficient.")
    parser.add_argument("--entropy-coef", type=float, default=0.01, help="Entropy bonus coefficient.")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate.")
    parser.add_argument("--hidden", type=int, default=64, help="Hidden layer width.")
    parser.add_argument("--limit", type=int, default=0, help="Max transitions to read (0 = no limit).")
    parser.add_argument("--device", default="cpu", help="Device: cpu or cuda.")
    parser.add_argument("--seed", type=int, default=7, help="Random seed.")
    args = parser.parse_args()

    transitions, action_list, action_index = load_transitions(args.log, limit=args.limit, default_actions=DEFAULT_ACTIONS)
    if not transitions:
        print("no_transitions_found")
        return

    rows, episode_ranges = build_rollouts(transitions, action_index)

    try:
        import torch
        import torch.nn as nn
        import torch.nn.functional as F
        import torch.optim as optim
    except Exception as exc:
        print("pytorch_missing={}".format(exc))
        print("install=torch (pip install torch)")
        return

    torch.manual_seed(args.seed)
    device = torch.device(args.device)

    class ActorCritic(nn.Module):
        def __init__(self, in_dim, out_dim, hidden_dim):
            super(ActorCritic, self).__init__()
            self.policy_net = nn.Sequential(
                nn.Linear(in_dim, hidden_dim),
                nn.Tanh(),
                nn.Linear(hidden_dim, hidden_dim),
                nn.Tanh(),
                nn.Linear(hidden_dim, out_dim),
            )
            self.value_net = nn.Sequential(
                nn.Linear(in_dim, hidden_dim),
                nn.Tanh(),
                nn.Linear(hidden_dim, hidden_dim),
                nn.Tanh(),
                nn.Linear(hidden_dim, 1),
            )

        def policy(self, x):
            return self.policy_net(x)

        def value(self, x):
            return self.value_net(x).squeeze(1)

    states = torch.tensor([row["state"] for row in rows], dtype=torch.float32, device=device)
    actions = torch.tensor([row["action"] for row in rows], dtype=torch.int64, device=device)
    rewards = [float(row["reward"]) for row in rows]
    dones = [float(row["done"]) for row in rows]

    model = ActorCritic(len(FEATURES), len(action_list), args.hidden).to(device)
    opt = optim.Adam(model.parameters(), lr=args.lr)

    last_actor = 0.0
    last_value = 0.0
    last_entropy = 0.0
    avg_reward = sum(rewards) / max(1, len(rewards))

    for epoch in range(args.epochs):
        with torch.no_grad():
            logits = model.policy(states)
            values = model.value(states)
            old_log_probs = F.log_softmax(logits, dim=1).gather(1, actions.unsqueeze(1)).squeeze(1)
            advantages, returns = compute_gae(
                values.detach().cpu().tolist(),
                rewards,
                dones,
                episode_ranges,
                gamma=args.gamma,
                gae_lambda=args.gae_lambda,
            )

        advantages = torch.tensor(advantages, dtype=torch.float32, device=device)
        returns = torch.tensor(returns, dtype=torch.float32, device=device)
        if advantages.numel() > 1:
            advantages = (advantages - advantages.mean()) / (advantages.std(unbiased=False) + 1e-8)

        perm = torch.randperm(states.size(0), device=device)
        actor_total = 0.0
        value_total = 0.0
        entropy_total = 0.0
        batches = 0

        for start in range(0, states.size(0), args.batch):
            idx = perm[start : start + args.batch]
            logits_mb = model.policy(states[idx])
            log_probs_all = F.log_softmax(logits_mb, dim=1)
            probs_all = log_probs_all.exp()
            log_probs = log_probs_all.gather(1, actions[idx].unsqueeze(1)).squeeze(1)
            ratio = torch.exp(log_probs - old_log_probs[idx])

            unclipped = ratio * advantages[idx]
            clipped = torch.clamp(ratio, 1.0 - args.clip_ratio, 1.0 + args.clip_ratio) * advantages[idx]
            actor_loss = -torch.min(unclipped, clipped).mean()

            value_pred = model.value(states[idx])
            value_loss = F.mse_loss(value_pred, returns[idx])
            entropy = -(probs_all * log_probs_all).sum(dim=1).mean()

            loss = actor_loss + args.value_coef * value_loss - args.entropy_coef * entropy
            opt.zero_grad()
            loss.backward()
            opt.step()

            actor_total += float(actor_loss.item())
            value_total += float(value_loss.item())
            entropy_total += float(entropy.item())
            batches += 1

        last_actor = actor_total / max(1, batches)
        last_value = value_total / max(1, batches)
        last_entropy = entropy_total / max(1, batches)
        print(
            "epoch={} actor_loss={:.6f} value_loss={:.6f} entropy={:.6f} avg_reward={:.3f}".format(
                epoch + 1, last_actor, last_value, last_entropy, avg_reward
            )
        )

    checkpoint = {
        "algorithm": "ppo-style",
        "policy_prefix": "policy_net",
        "value_prefix": "value_net",
        "state_dict": model.state_dict(),
    }
    torch.save(checkpoint, args.out)

    meta = {
        "algorithm": "ppo-style",
        "policy": "categorical",
        "output": "logits",
        "policy_prefix": "policy_net",
        "value_prefix": "value_net",
        "actions": action_list,
        "features": FEATURES,
        "norms": NORMS,
        "hidden": args.hidden,
        "gamma": args.gamma,
        "gae_lambda": args.gae_lambda,
        "clip_ratio": args.clip_ratio,
        "avg_reward": avg_reward,
        "last_actor_loss": last_actor,
        "last_value_loss": last_value,
        "last_entropy": last_entropy,
        "episodes": len(episode_ranges),
        "transitions": len(rows),
    }
    with open(args.out_meta, "w", encoding="utf-8") as f:
        json.dump(meta, f)

    print("saved_model={}".format(args.out))
    print("saved_meta={}".format(args.out_meta))


if __name__ == "__main__":
    main()
