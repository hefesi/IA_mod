import argparse
import json
from pathlib import Path

from rl_common import iter_transitions


def main():
    parser = argparse.ArgumentParser(description="Exporta logs de microdecisao para treinar micro-IAs separadas.")
    parser.add_argument("--log", default="mindustry.log", help="Arquivo de log do Mindustry/servidor RL.")
    parser.add_argument("--out-dir", default="micro_datasets", help="Diretorio de saida para datasets por politica.")
    parser.add_argument("--limit", type=int, default=0, help="Maximo de transicoes a ler (0 = sem limite).")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    buckets = {}
    for tr in iter_transitions(args.log, limit=args.limit, transition_type="micro"):
        policy = tr.get("policy") or "unknown"
        buckets.setdefault(policy, []).append(tr)

    if not buckets:
        print("no_micro_transitions_found")
        return

    for policy, rows in sorted(buckets.items()):
        slug = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in policy).strip("_") or "unknown"
        data_path = out_dir / f"{slug}.jsonl"
        meta_path = out_dir / f"{slug}.meta.json"
        action_counter = {}
        for row in rows:
            action = row.get("a", "unknown")
            action_counter[action] = action_counter.get(action, 0) + 1
        with data_path.open("w", encoding="utf-8") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
        with meta_path.open("w", encoding="utf-8") as f:
            json.dump(
                {
                    "policy": policy,
                    "transitions": len(rows),
                    "actions": sorted(action_counter.items(), key=lambda item: (-item[1], item[0])),
                },
                f,
                ensure_ascii=False,
                indent=2,
            )
        print(f"saved={data_path}")
        print(f"saved={meta_path}")


if __name__ == "__main__":
    main()
