import json
from pathlib import Path

from rl_common import (
    FEATURES,
    is_terminal_transition,
    iter_transitions,
    num,
    reward_from_transition,
    transition_tick,
)


def optional_dependency_error(name, exc):
    return RuntimeError("missing_dependency={} detail={}".format(name, exc))


def flatten_transition(tr):
    state = tr.get("s") or {}
    next_state = tr.get("s2") or {}
    info = tr.get("info") or {}

    row = {
        "tick": transition_tick(tr),
        "transition_type": tr.get("type") or "transition",
        "action": tr.get("a", "noop"),
        "reward": float(reward_from_transition(tr)),
        "terminal": bool(is_terminal_transition(tr)),
        "state_json": json.dumps(state, ensure_ascii=False, sort_keys=True),
        "next_state_json": json.dumps(next_state, ensure_ascii=False, sort_keys=True),
        "info_json": json.dumps(info, ensure_ascii=False, sort_keys=True),
    }

    for name in FEATURES:
        row["state_" + name] = float(num(state, name))
        row["next_" + name] = float(num(next_state, name))

    return row


def iter_rows(log_path, limit=0, transition_type="any"):
    for tr in iter_transitions(log_path, limit=limit, transition_type=transition_type):
        yield flatten_transition(tr)


def iter_row_batches(log_path, limit=0, transition_type="any", batch_size=2048):
    if batch_size <= 0:
        raise ValueError("batch_size_must_be_positive")

    batch = []
    for row in iter_rows(log_path, limit=limit, transition_type=transition_type):
        batch.append(row)
        if len(batch) >= batch_size:
            yield batch
            batch = []

    if batch:
        yield batch


def convert_log_to_parquet(log_path, out_path, limit=0, transition_type="any", batch_size=2048):
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except Exception as exc:
        raise optional_dependency_error("pyarrow", exc)

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    writer = None
    row_count = 0
    column_count = 0
    schema = None

    try:
        for rows in iter_row_batches(log_path, limit=limit, transition_type=transition_type, batch_size=batch_size):
            if schema is None:
                table = pa.Table.from_pylist(rows)
                schema = table.schema
                column_count = len(schema.names)
                writer = pq.ParquetWriter(out, schema)
            else:
                table = pa.Table.from_pylist(rows, schema=schema)
            writer.write_table(table)
            row_count += len(rows)
    finally:
        if writer is not None:
            writer.close()

    if row_count == 0:
        raise ValueError("no_rows_to_export")

    return {
        "rows": row_count,
        "columns": column_count,
        "out_path": str(out),
    }


def run_duckdb_query(parquet_path, sql, params=None):
    try:
        import duckdb
    except Exception as exc:
        raise optional_dependency_error("duckdb", exc)

    conn = duckdb.connect(database=":memory:")
    try:
        conn.execute("create or replace view dataset as select * from read_parquet(?)", [str(parquet_path)])
        return conn.execute(sql, params or []).fetchall()
    finally:
        conn.close()


def default_summary_queries(parquet_path):
    return {
        "counts": run_duckdb_query(
            parquet_path,
            "select count(*) as rows, cast(sum(case when terminal then 1 else 0 end) as integer) as terminal_rows, round(avg(reward), 4) as avg_reward from dataset",
        ),
        "by_action": run_duckdb_query(
            parquet_path,
            """
            select action, count(*) as transitions, round(avg(reward), 4) as avg_reward
            from dataset
            group by action
            order by transitions desc, action asc
            """,
        ),
    }
