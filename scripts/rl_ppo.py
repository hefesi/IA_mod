import argparse
import json
import random
from collections import OrderedDict
from pathlib import Path

from rl_common import DEFAULT_ACTIONS, FEATURES, NORMS, load_transitions
from rl_data import convert_log_to_parquet
from rl_env import MindustryDatasetEnv, MindustryScenarioEnv, missing_dependency_message


def resolve_env_mode(args):
    if args.env != "auto":
        return args.env
    if args.scenarios:
        return "scenarios"
    return "dataset"


def set_global_seed(seed, np_module=None, torch_module=None):
    random.seed(seed)
    if np_module is not None:
        np_module.random.seed(seed)
    if torch_module is not None:
        torch_module.manual_seed(seed)
        if torch_module.cuda.is_available():
            torch_module.cuda.manual_seed_all(seed)
        try:
            torch_module.use_deterministic_algorithms(True, warn_only=True)
        except TypeError:
            torch_module.use_deterministic_algorithms(True)
        except Exception:
            pass
        if hasattr(torch_module.backends, "cudnn"):
            torch_module.backends.cudnn.benchmark = False
            torch_module.backends.cudnn.deterministic = True


def linear_layers(module, linear_type):
    layers = []
    if module is None:
        return layers
    for item in module.modules():
        if isinstance(item, linear_type):
            layers.append(item)
    return layers


def build_export_state_dict(model, torch_module):
    nn = torch_module.nn
    policy_layers = linear_layers(model.policy.mlp_extractor.policy_net, nn.Linear)
    value_layers = linear_layers(model.policy.mlp_extractor.value_net, nn.Linear)
    policy_layers.append(model.policy.action_net)
    value_layers.append(model.policy.value_net)

    state_dict = OrderedDict()
    for idx, layer in enumerate(policy_layers):
        key_idx = idx * 2
        state_dict["policy_net.{}.weight".format(key_idx)] = layer.weight.detach().cpu()
        state_dict["policy_net.{}.bias".format(key_idx)] = layer.bias.detach().cpu()
    for idx, layer in enumerate(value_layers):
        key_idx = idx * 2
        state_dict["value_net.{}.weight".format(key_idx)] = layer.weight.detach().cpu()
        state_dict["value_net.{}.bias".format(key_idx)] = layer.bias.detach().cpu()
    return state_dict


def build_env_factory(env_mode, args, action_list):
    if env_mode == "scenarios":
        def factory():
            return MindustryScenarioEnv.from_file(
                args.scenarios,
                max_episode_steps=args.max_episode_steps,
                seed=args.seed,
            )

        return factory

    def factory():
        return MindustryDatasetEnv.from_log(
            args.log,
            limit=args.limit,
            default_actions=action_list,
            max_episode_steps=args.max_episode_steps,
            seed=args.seed,
        )

    return factory


def maybe_init_wandb(args):
    if not args.wandb_project:
        return None, None

    try:
        import wandb
        from wandb.integration.sb3 import WandbCallback
    except Exception as exc:
        print("wandb_missing={}".format(exc))
        print("install='pip install wandb'")
        raise SystemExit(1)

    tags = [tag.strip() for tag in args.wandb_tags.split(",") if tag.strip()]
    run = wandb.init(
        project=args.wandb_project,
        entity=args.wandb_entity or None,
        name=args.wandb_run_name or None,
        tags=tags or None,
        mode="offline" if args.wandb_offline else None,
        config={k: v for k, v in vars(args).items() if isinstance(v, (str, int, float, bool))},
        sync_tensorboard=True,
    )
    return run, WandbCallback(verbose=0)


def main():
    parser = argparse.ArgumentParser(description="Stable-Baselines3 PPO trainer for Mindustry decision logs/scenarios.")
    parser.add_argument("--env", choices=["auto", "dataset", "scenarios"], default="auto", help="Training environment source.")
    parser.add_argument("--log", default="mindustry.log", help="Path to Mindustry log or socket log.")
    parser.add_argument("--scenarios", default="", help="Path to fixed scenario JSON for deterministic validation/training.")
    parser.add_argument("--out", default="ppo_model.pt", help="Output checkpoint path compatible with rl_export_nn_json.py.")
    parser.add_argument("--out-meta", default="ppo_meta.json", help="Output metadata path.")
    parser.add_argument("--out-sb3", default="", help="Optional raw Stable-Baselines3 .zip output.")
    parser.add_argument("--epochs", type=int, default=8, help="Number of PPO rollout/update cycles.")
    parser.add_argument("--n-steps", type=int, default=256, help="Rollout steps collected per PPO update.")
    parser.add_argument("--batch", type=int, default=64, help="Mini-batch size.")
    parser.add_argument("--gamma", type=float, default=0.98, help="Discount factor.")
    parser.add_argument("--gae-lambda", type=float, default=0.95, help="GAE lambda.")
    parser.add_argument("--clip-ratio", type=float, default=0.2, help="PPO clip ratio.")
    parser.add_argument("--value-coef", type=float, default=0.5, help="Value loss coefficient.")
    parser.add_argument("--entropy-coef", type=float, default=0.01, help="Entropy bonus coefficient.")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate.")
    parser.add_argument("--hidden", type=int, default=64, help="Hidden layer width.")
    parser.add_argument("--limit", type=int, default=0, help="Max transitions to read from logs (0 = no limit).")
    parser.add_argument("--device", default="cpu", help="Device: cpu, cuda or auto.")
    parser.add_argument("--seed", type=int, default=7, help="Random seed.")
    parser.add_argument("--eval-episodes", type=int, default=5, help="Episodes for deterministic evaluation after training.")
    parser.add_argument("--max-episode-steps", type=int, default=128, help="Episode horizon used by the Gymnasium wrapper.")
    parser.add_argument("--parquet-out", default="", help="Optional Parquet export of the training log for DuckDB analysis.")
    parser.add_argument("--wandb-project", default="", help="Weights & Biases project name.")
    parser.add_argument("--wandb-entity", default="", help="Weights & Biases entity/team.")
    parser.add_argument("--wandb-run-name", default="", help="Weights & Biases run name.")
    parser.add_argument("--wandb-tags", default="mindustry,rl,ppo", help="Comma-separated W&B tags.")
    parser.add_argument("--wandb-offline", action="store_true", help="Run Weights & Biases in offline mode.")
    args = parser.parse_args()

    env_mode = resolve_env_mode(args)

    try:
        import numpy as np
        import torch
        from stable_baselines3 import PPO
        from stable_baselines3.common.callbacks import CallbackList
        from stable_baselines3.common.evaluation import evaluate_policy
        from stable_baselines3.common.vec_env import DummyVecEnv, VecMonitor
    except Exception as exc:
        print("sb3_dependencies_missing={}".format(exc))
        print("rl_env={}".format(missing_dependency_message()))
        print("install='pip install stable-baselines3 gymnasium numpy torch'")
        return

    action_list = list(DEFAULT_ACTIONS)
    dataset_size = 0
    scenario_count = 0

    if env_mode == "dataset":
        transitions, action_list, _ = load_transitions(args.log, limit=args.limit, default_actions=DEFAULT_ACTIONS)
        dataset_size = len(transitions)
        if not transitions:
            print("no_transitions_found")
            return
        if args.parquet_out:
            try:
                stats = convert_log_to_parquet(args.log, args.parquet_out, limit=args.limit, transition_type="any")
            except Exception as exc:
                print("parquet_export_failed={}".format(exc))
                return
            print("parquet_rows={rows} parquet_columns={columns} parquet_out={out_path}".format(**stats))
    else:
        payload = json.loads(Path(args.scenarios).read_text(encoding="utf-8"))
        action_list = list(payload.get("actions") or DEFAULT_ACTIONS)
        scenario_count = len(payload.get("scenarios") or [])
        if scenario_count == 0:
            print("no_scenarios_found")
            return

    set_global_seed(args.seed, np_module=np, torch_module=torch)
    env_factory = build_env_factory(env_mode, args, action_list)
    train_env = VecMonitor(DummyVecEnv([env_factory]))
    eval_env = VecMonitor(DummyVecEnv([env_factory]))
    train_env.seed(args.seed)
    eval_seed = args.seed + 1000
    eval_env.seed(eval_seed)

    policy_kwargs = dict(
        activation_fn=torch.nn.Tanh,
        net_arch=dict(pi=[args.hidden, args.hidden], vf=[args.hidden, args.hidden]),
    )

    run = None
    callbacks = []
    wandb_run, wandb_callback = maybe_init_wandb(args)
    if wandb_run is not None:
        run = wandb_run
        callbacks.append(wandb_callback)

    total_timesteps = max(args.batch, args.n_steps * args.epochs)
    model = PPO(
        policy="MlpPolicy",
        env=train_env,
        learning_rate=args.lr,
        n_steps=args.n_steps,
        batch_size=args.batch,
        gamma=args.gamma,
        gae_lambda=args.gae_lambda,
        clip_range=args.clip_ratio,
        ent_coef=args.entropy_coef,
        vf_coef=args.value_coef,
        seed=args.seed,
        device=args.device,
        policy_kwargs=policy_kwargs,
        verbose=1,
    )

    callback = CallbackList(callbacks) if callbacks else None
    model.learn(total_timesteps=total_timesteps, callback=callback, progress_bar=False)

    eval_rewards, eval_lengths = evaluate_policy(
        model,
        eval_env,
        n_eval_episodes=args.eval_episodes,
        deterministic=True,
        return_episode_rewards=True,
        warn=False,
    )
    eval_mean_reward = float(sum(eval_rewards) / max(1, len(eval_rewards)))
    eval_mean_length = float(sum(eval_lengths) / max(1, len(eval_lengths)))

    out_sb3 = args.out_sb3 or str(Path(args.out).with_suffix(".zip"))
    model.save(out_sb3)

    checkpoint = {
        "algorithm": "stable-baselines3-ppo",
        "policy_prefix": "policy_net",
        "value_prefix": "value_net",
        "state_dict": build_export_state_dict(model, torch),
    }
    torch.save(checkpoint, args.out)

    meta = {
        "algorithm": "stable-baselines3-ppo",
        "policy": "categorical",
        "output": "logits",
        "policy_prefix": "policy_net",
        "value_prefix": "value_net",
        "actions": action_list,
        "features": FEATURES,
        "norms": NORMS,
        "env_mode": env_mode,
        "hidden": args.hidden,
        "learning_rate": args.lr,
        "gamma": args.gamma,
        "gae_lambda": args.gae_lambda,
        "clip_ratio": args.clip_ratio,
        "value_coef": args.value_coef,
        "entropy_coef": args.entropy_coef,
        "seed": args.seed,
        "timesteps": total_timesteps,
        "n_steps": args.n_steps,
        "batch_size": args.batch,
        "eval_episodes": args.eval_episodes,
        "eval_mean_reward": eval_mean_reward,
        "eval_mean_length": eval_mean_length,
        "dataset_transitions": dataset_size,
        "scenario_count": scenario_count,
        "sb3_model": out_sb3,
        "parquet_out": args.parquet_out or "",
    }
    with open(args.out_meta, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    if run is not None:
        run.log(
            {
                "eval/mean_reward": eval_mean_reward,
                "eval/mean_length": eval_mean_length,
                "train/timesteps": total_timesteps,
            }
        )
        run.finish()

    train_env.close()
    eval_env.close()

    print("env_mode={}".format(env_mode))
    print("timesteps={}".format(total_timesteps))
    print("eval_mean_reward={:.4f}".format(eval_mean_reward))
    print("eval_mean_length={:.4f}".format(eval_mean_length))
    print("saved_model={}".format(args.out))
    print("saved_meta={}".format(args.out_meta))
    print("saved_sb3={}".format(out_sb3))


if __name__ == "__main__":
    main()
