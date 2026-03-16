import argparse
import json
import random
from collections import defaultdict


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


FEATURE_BUCKETS = [
    ("copper", [0, 50, 100, 200, 400, 800]),
    ("lead", [0, 50, 100, 200, 400, 800]),
    ("drills", [0, 1, 2, 3, 4, 5]),
    ("turrets", [0, 2, 4, 6, 8]),
    ("power", [0, 1, 2, 3]),
    ("enemies", [0, 1, 3, 6, 10, 20]),
    ("unitsTotal", [0, 3, 6, 10, 20, 40]),
    ("coreHealthFrac", [0.1, 0.25, 0.5, 0.75, 0.9]),
    ("corePresent", [0.5]),
    ("enemyCore", [0.5]),
    ("distEnemy", [5, 10, 20, 40, 80]),
]


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

    transitions, action_list, action_index = load_transitions(args.log, limit=args.limit)
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
            r = reward(s, s2)
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
        "features": [{"name": name, "bins": bins} for name, bins in FEATURE_BUCKETS],
        "q": {",".join(map(str, k)): v for k, v in q.items()},
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f)

    print("saved={}".format(args.out))


if __name__ == "__main__":
    main()
