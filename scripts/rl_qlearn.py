import argparse
import json
import random
from collections import defaultdict

from rl_common import (
    DEFAULT_ACTIONS,
    FEATURE_DEFS,
    FEATURE_BUCKETS,
    NORMS,
    load_transitions,
    num,
    reward_from_transition,
)


def bucketize(val, bins):
    idx = 0
    for b in bins:
        if val >= b:
            idx += 1
    return idx


def encode_state(s):
    key = []
    for name, bins in FEATURE_BUCKETS:
        key.append(bucketize(num(s, name), bins))
    return tuple(key)


def main():
    parser = argparse.ArgumentParser(description="Offline Q-Learning trainer for Mindustry RL logs.")
    parser.add_argument("--log", default="mindustry.log", help="Path to Mindustry log or socket log.")
    parser.add_argument("--out", default="q_table.json", help="Output Q-table JSON.")
    parser.add_argument("--alpha", type=float, default=0.2, help="Learning rate.")
    parser.add_argument("--gamma", type=float, default=0.95, help="Discount factor.")
    parser.add_argument("--epochs", type=int, default=5, help="Number of passes over the data.")
    parser.add_argument("--shuffle", action="store_true", help="Shuffle transitions each epoch.")
    parser.add_argument("--limit", type=int, default=0, help="Max transitions to read (0 = no limit).")
    args = parser.parse_args()

    transitions, action_list, action_index = load_transitions(args.log, limit=args.limit, default_actions=DEFAULT_ACTIONS)
    if not transitions:
        print("no_transitions_found")
        return

    q = defaultdict(lambda: [0.0] * len(action_list))

    for epoch in range(args.epochs):
        if args.shuffle:
            random.shuffle(transitions)
        total_r = 0.0
        for tr in transitions:
            s = tr.get("s", {})
            s2 = tr.get("s2", {})
            a = tr.get("a", "noop")
            a_idx = action_index.get(a, action_index.get("noop", 0))
            r = reward_from_transition(tr)
            total_r += r

            key = encode_state(s)
            key2 = encode_state(s2)
            best_next = max(q[key2])
            old = q[key][a_idx]
            q[key][a_idx] = old + args.alpha * (r + args.gamma * best_next - old)

        avg_r = total_r / max(1, len(transitions))
        print("epoch={} avg_reward={:.3f}".format(epoch + 1, avg_r))

    out = {
        "actions": action_list,
        "features": FEATURE_DEFS,
        "norms": NORMS,
        "q": {",".join(map(str, k)): v for k, v in q.items()},
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f)

    print("saved={}".format(args.out))


if __name__ == "__main__":
    main()
