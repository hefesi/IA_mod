import argparse

from rl_data import convert_log_to_parquet


def main():
    parser = argparse.ArgumentParser(description="Convert Mindustry RL JSONL logs to Parquet for DuckDB analysis.")
    parser.add_argument("--log", default="rl_socket.log", help="Input RL log (JSONL or Mindustry [RL] lines).")
    parser.add_argument("--out", default="logs/rl_socket.parquet", help="Output Parquet path.")
    parser.add_argument("--limit", type=int, default=0, help="Max transitions to export (0 = no limit).")
    parser.add_argument("--transition-type", default="any", help="Filter by transition type: any, transition, macro or micro.")
    args = parser.parse_args()

    try:
        stats = convert_log_to_parquet(args.log, args.out, limit=args.limit, transition_type=args.transition_type)
    except Exception as exc:
        print("parquet_export_failed={}".format(exc))
        return

    print("rows={rows} columns={columns} out={out_path}".format(**stats))


if __name__ == "__main__":
    main()
