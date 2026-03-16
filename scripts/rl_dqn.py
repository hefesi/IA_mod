import argparse
import json
import random


DEFAULT_ACTIONS = ["attackWave", "rally", "mine", "defend", "power", "noop"]


def num(d, key):
    try:
        return float(d.get(key, 0))
    except Exception:
        return 0.0


def reward(s, s2):
    r = 0.0
    r += 0.005 * (num(s2, "copper") - num(s, "copper"))
    r += 0.007 * (num(s2, "lead") - num(s, "lead"))
    r += 2.0 * (num(s2, "drills") - num(s, "drills"))
    r += 4.0 * (num(s2, "turrets") - num(s, "turrets"))
    r += 1.5 * (num(s2, "power") - num(s, "power"))
    r += 6.0 * max(0.0, num(s, "enemies") - num(s2, "enemies"))
    r -= 1.5 * max(0.0, num(s, "unitsTotal") - num(s2, "unitsTotal"))
    r += 50.0 * (num(s2, "coreHealthFrac") - num(s, "coreHealthFrac"))
    if num(s, "enemyCore") == 1 and num(s2, "enemyCore") == 0:
        r += 200.0
    if num(s, "corePresent") == 1 and num(s2, "corePresent") == 0:
        r -= 250.0
    return r


FEATURES = [
    "copper",
    "lead",
    "drills",
    "turrets",
    "power",
    "enemies",
    "unitsTotal",
    "coreHealthFrac",
    "corePresent",
    "enemyCore",
    "distEnemy",
]

NORMS = {
    "copper": 1000.0,
    "lead": 1000.0,
    "drills": 10.0,
    "turrets": 10.0,
    "power": 5.0,
    "enemies": 50.0,
    "unitsTotal": 50.0,
    "coreHealthFrac": 1.0,
    "corePresent": 1.0,
    "enemyCore": 1.0,
    "distEnemy": 100.0,
}


def vec_from_state(s):
    vec = []
    for name in FEATURES:
        v = num(s, name)
        n = NORMS.get(name, 1.0)
        if n <= 0:
            n = 1.0
        v = max(-10.0, min(10.0, v / n))
        vec.append(v)
    return vec


def iter_transitions(log_path, limit=0):
    count = 0
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            payload = None
            if "[RL]" in line:
                payload = line.split("[RL]", 1)[1].strip()
            else:
                payload = line.strip()
            if not payload:
                continue
            try:
                yield json.loads(payload)
            except json.JSONDecodeError:
                continue
            count += 1
            if limit and count >= limit:
                break


def load_transitions(log_path, limit=0):
    transitions = []
    actions = set(DEFAULT_ACTIONS)
    for tr in iter_transitions(log_path, limit=limit):
        a = tr.get("a", "noop")
        actions.add(a)
        transitions.append(tr)
    action_list = DEFAULT_ACTIONS + sorted(a for a in actions if a not in DEFAULT_ACTIONS)
    action_index = {a: i for i, a in enumerate(action_list)}
    return transitions, action_list, action_index


def build_dataset(transitions, action_index):
    data = []
    for tr in transitions:
        s = tr.get("s", {})
        s2 = tr.get("s2", {})
        a = tr.get("a", "noop")
        a_idx = action_index.get(a, action_index.get("noop", 0))
        r = reward(s, s2)
        done = 0.0
        if num(s, "enemyCore") == 1 and num(s2, "enemyCore") == 0:
            done = 1.0
        if num(s, "corePresent") == 1 and num(s2, "corePresent") == 0:
            done = 1.0
        data.append((vec_from_state(s), a_idx, r, vec_from_state(s2), done))
    return data


def main():
    parser = argparse.ArgumentParser(description="Offline DQN trainer for Mindustry RL logs.")
    parser.add_argument("--log", default="mindustry.log", help="Path to Mindustry log or socket log.")
    parser.add_argument("--out", default="dqn_model.pt", help="Output model path.")
    parser.add_argument("--out-meta", default="dqn_meta.json", help="Output metadata path.")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs.")
    parser.add_argument("--batch", type=int, default=64, help="Batch size.")
    parser.add_argument("--gamma", type=float, default=0.98, help="Discount factor.")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate.")
    parser.add_argument("--target-update", type=int, default=2, help="Target update period (epochs).")
    parser.add_argument("--limit", type=int, default=0, help="Max transitions to read (0 = no limit).")
    parser.add_argument("--device", default="cpu", help="Device: cpu or cuda.")
    args = parser.parse_args()

    transitions, action_list, action_index = load_transitions(args.log, limit=args.limit)
    if not transitions:
        print("no_transitions_found")
        return

    data = build_dataset(transitions, action_index)

    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim
    except Exception as exc:
        print("pytorch_missing={}".format(exc))
        print("install=torch (pip install torch)")
        return

    device = torch.device(args.device)

    class QNet(nn.Module):
        def __init__(self, in_dim, out_dim):
            super(QNet, self).__init__()
            self.net = nn.Sequential(
                nn.Linear(in_dim, 64),
                nn.ReLU(),
                nn.Linear(64, 64),
                nn.ReLU(),
                nn.Linear(64, out_dim),
            )

        def forward(self, x):
            return self.net(x)

    in_dim = len(FEATURES)
    out_dim = len(action_list)
    policy = QNet(in_dim, out_dim).to(device)
    target = QNet(in_dim, out_dim).to(device)
    target.load_state_dict(policy.state_dict())

    opt = optim.Adam(policy.parameters(), lr=args.lr)
    loss_fn = nn.MSELoss()

    for epoch in range(args.epochs):
        random.shuffle(data)
        total_loss = 0.0
        for i in range(0, len(data), args.batch):
            batch = data[i : i + args.batch]
            s = torch.tensor([b[0] for b in batch], dtype=torch.float32, device=device)
            a = torch.tensor([b[1] for b in batch], dtype=torch.int64, device=device)
            r = torch.tensor([b[2] for b in batch], dtype=torch.float32, device=device)
            s2 = torch.tensor([b[3] for b in batch], dtype=torch.float32, device=device)
            done = torch.tensor([b[4] for b in batch], dtype=torch.float32, device=device)

            q = policy(s).gather(1, a.unsqueeze(1)).squeeze(1)
            with torch.no_grad():
                max_next = target(s2).max(1).values
                target_q = r + args.gamma * (1.0 - done) * max_next

            loss = loss_fn(q, target_q)
            opt.zero_grad()
            loss.backward()
            opt.step()
            total_loss += float(loss.item())

        avg_loss = total_loss / max(1, (len(data) // args.batch) + 1)
        print("epoch={} avg_loss={:.6f}".format(epoch + 1, avg_loss))

        if (epoch + 1) % args.target_update == 0:
            target.load_state_dict(policy.state_dict())

    torch.save(policy.state_dict(), args.out)

    meta = {
        "actions": action_list,
        "features": FEATURES,
        "norms": NORMS,
    }
    with open(args.out_meta, "w", encoding="utf-8") as f:
        json.dump(meta, f)

    print("saved_model={}".format(args.out))
    print("saved_meta={}".format(args.out_meta))


if __name__ == "__main__":
    main()
