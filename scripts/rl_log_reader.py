import argparse
import json


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


def iter_transitions(log_path):
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


def main():
    parser = argparse.ArgumentParser(description="Parse Mindustry RL logs and compute rewards.")
    parser.add_argument("--log", default="mindustry.log", help="Path to Mindustry log file.")
    parser.add_argument("--print", action="store_true", help="Print each transition with reward.")
    parser.add_argument("--limit", type=int, default=0, help="Max transitions to read (0 = no limit).")
    args = parser.parse_args()

    count = 0
    total = 0.0
    min_r = None
    max_r = None

    for tr in iter_transitions(args.log):
        s = tr.get("s", {})
        s2 = tr.get("s2", {})
        r = reward(s, s2)
        if args.print:
            print("t={t} a={a} r={r:.2f}".format(t=tr.get("t"), a=tr.get("a"), r=r))

        count += 1
        total += r
        min_r = r if min_r is None else min(min_r, r)
        max_r = r if max_r is None else max(max_r, r)

        if args.limit and count >= args.limit:
            break

    avg = (total / count) if count else 0.0
    print("transitions={c} avg_reward={a:.3f} min={mn:.3f} max={mx:.3f}".format(
        c=count, a=avg, mn=(min_r or 0.0), mx=(max_r or 0.0)
    ))


if __name__ == "__main__":
    main()
