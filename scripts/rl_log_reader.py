import argparse
from rl_common import iter_transitions, reward_from_transition


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
        r = reward_from_transition(tr)
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
