import argparse
import json

from rl_data import default_summary_queries, run_duckdb_query


def main():
    parser = argparse.ArgumentParser(description="Run DuckDB queries over Mindustry RL Parquet datasets.")
    parser.add_argument("--parquet", default="logs/rl_socket.parquet", help="Input Parquet dataset.")
    parser.add_argument("--sql", default="", help="Custom SQL to run against the dataset view.")
    parser.add_argument("--summary", action="store_true", help="Run built-in summary queries.")
    args = parser.parse_args()

    try:
        if args.summary or not args.sql:
            payload = default_summary_queries(args.parquet)
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            return

        rows = run_duckdb_query(args.parquet, args.sql)
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    except Exception as exc:
        print("duckdb_query_failed={}".format(exc))
        import sys
        sys.exit(1)


if __name__ == "__main__":
    main()
