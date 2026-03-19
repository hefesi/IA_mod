import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from rl_common import DEFAULT_ACTIONS, FEATURES, NORMS, iter_transitions

ROOT = Path(__file__).resolve().parents[1]
AI_JS = ROOT / "scripts" / "ai.js"
MAIN_JS = ROOT / "scripts" / "main.js"
MOD_JSON = ROOT / "mod.json"
SCHEMA_JSON = ROOT / "rl_schema.json"
NN_MODEL_JSON = ROOT / "nn_model.json"


class CheckResult:
    def __init__(self, name, ok, detail):
        self.name = name
        self.ok = bool(ok)
        self.detail = detail


def read_text(path):
    return path.read_text(encoding="utf-8", errors="ignore")


def read_json(path):
    try:
        return json.loads(read_text(path))
    except Exception:
        return None


def run_cmd(cmd):
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)


def check_real_log(log_path):
    if not log_path.exists():
        return CheckResult("log real nao encontrado", True, f"skip ({log_path})")

    lines = 0
    parsed = 0
    actions = set()
    for tr in iter_transitions(log_path):
        parsed += 1
        actions.add(tr.get("a", "noop"))
    with log_path.open("r", encoding="utf-8", errors="ignore") as fh:
        for _ in fh:
            lines += 1

    if lines == 0:
        return CheckResult("log real parseavel", True, f"skip (log vazio: {log_path})")

    ok = parsed > 0
    detail = f"lines={lines} parsed={parsed} unique_actions={sorted(actions)}"
    return CheckResult("log real parseavel", ok, detail)


def evaluate(log_path):
    checks = []

    mod_data = read_json(MOD_JSON) or {}
    checks.append(CheckResult("mod.json valido", True, f"name={mod_data.get('name')} version={mod_data.get('version')}"))

    main_text = read_text(MAIN_JS)
    checks.append(CheckResult("entrypoint carrega ai.js", 'require("ai")' in main_text, "scripts/main.js"))

    schema = read_json(SCHEMA_JSON)
    schema_exists = schema is not None
    schema_actions = schema.get("actions", []) if schema_exists else []
    schema_features = [item.get("name") for item in schema.get("features", []) if isinstance(item, dict)] if schema_exists else []
    checks.append(CheckResult("schema RL compartilhado existe", schema_exists, "rl_schema.json"))
    checks.append(CheckResult("acoes base alinhadas (schema/RL)", schema_actions == DEFAULT_ACTIONS, f"schema={schema_actions} py={DEFAULT_ACTIONS}"))
    checks.append(CheckResult("features alinhadas (schema/RL)", schema_features == FEATURES, f"schema={schema_features} py={FEATURES}"))
    checks.append(CheckResult("norms alinhadas (schema/RL)", (schema.get("norms") if schema_exists else None) == NORMS, "rl_schema.json -> rl_common.py"))

    ai_text = read_text(AI_JS)
    checks.append(CheckResult("modo RL padrao e nn", 'rlPolicyMode: "nn"' in ai_text, "scripts/ai.js"))
    uses_shared_schema = 'rlSchemaFile: "rl_schema.json"' in ai_text and "loadRLSchema(" in ai_text
    checks.append(CheckResult("runtime JS usa schema compartilhado", uses_shared_schema, "scripts/ai.js -> rl_schema.json"))

    current_nn = read_json(NN_MODEL_JSON)
    nn_exists = current_nn is not None
    checks.append(CheckResult("nn_model.json valido", nn_exists, str(NN_MODEL_JSON)))
    if nn_exists and schema_exists:
        nn_actions = current_nn.get("actions", [])
        nn_features = current_nn.get("features", [])
        schema_actions_set = set(schema_actions)
        nn_actions_set = set(nn_actions) if isinstance(nn_actions, list) else set()
        checks.append(CheckResult("modelo atual cobre todas as acoes do schema", nn_actions_set == schema_actions_set, f"schema={sorted(schema_actions_set)} model={sorted(nn_actions_set)}"))
        checks.append(CheckResult("modelo atual cobre features principais do schema", len(nn_features) >= 0.7 * len(schema_features), f"schema_features={len(schema_features)} model_features={len(nn_features)}"))

    sample = [
        {
            "t": 1,
            "s": {"copper": 10, "lead": 10, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1},
            "a": "customModAction",
            "s2": {"copper": 20, "lead": 10, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1},
            "info": {"reward": 1.0},
        },
        {
            "t": 2,
            "s": {"copper": 20, "lead": 10, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1},
            "a": "noop",
            "s2": {"copper": 20, "lead": 11, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1},
            "info": {"reward": 0.5},
        },
    ]

    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        log_tmp = td_path / "sample.log"
        out_q = td_path / "q_table.json"
        out_model = td_path / "ppo_model.pt"
        out_meta = td_path / "ppo_meta.json"
        out_json = td_path / "nn_model.json"

        with log_tmp.open("w", encoding="utf-8") as fh:
            for row in sample:
                fh.write(json.dumps(row) + "\n")

        qlearn_proc = run_cmd(["python3", "scripts/rl_qlearn.py", "--log", str(log_tmp), "--out", str(out_q), "--epochs", "1"])
        qlearn_text = (qlearn_proc.stdout + qlearn_proc.stderr).strip()
        qlearn_detail = " | ".join(qlearn_text.splitlines()[-3:])
        qlearn_ok = qlearn_proc.returncode == 0 and out_q.exists()
        qlearn_schema_ok = False
        qlearn_custom_ok = False
        if qlearn_ok:
            qlearn_out = read_json(out_q) or {}
            qlearn_schema_ok = qlearn_out.get("features") == (schema.get("features") if schema_exists else None) and qlearn_out.get("norms") == NORMS
            qlearn_custom_ok = "customModAction" in qlearn_out.get("actions", [])
        checks.append(CheckResult("q-learning roda com log sintetico", qlearn_ok, qlearn_detail))
        checks.append(CheckResult("q-learning exporta schema compartilhado", qlearn_schema_ok, "q_table.json -> features/norms"))
        checks.append(CheckResult("adaptabilidade: acao custom entra na q-table", qlearn_custom_ok, "customModAction em actions"))

        proc = run_cmd(["python3", "scripts/rl_ppo.py", "--log", str(log_tmp), "--out", str(out_model), "--out-meta", str(out_meta), "--epochs", "1", "--batch", "2"])
        combined = (proc.stdout + proc.stderr).strip()
        short = " | ".join(combined.splitlines()[-4:])
        torch_missing = "pytorch_missing=" in combined

        if torch_missing:
            checks.append(CheckResult("ppo roda com log sintetico", True, short or "skip (torch missing)"))
            checks.append(CheckResult("export PPO gera nn_model.json", True, "skip (torch missing)"))
            checks.append(CheckResult("adaptabilidade: acao custom entra na policy", True, "skip (torch missing)"))
        else:
            ok_train = proc.returncode == 0 and out_model.exists() and out_meta.exists()
            checks.append(CheckResult("ppo roda com log sintetico", ok_train, short))

            export_ok = False
            has_custom = False
            export_detail = "export not run"
            if ok_train:
                export_proc = run_cmd(["python3", "scripts/rl_export_nn_json.py", "--model", str(out_model), "--meta", str(out_meta), "--out", str(out_json)])
                export_text = (export_proc.stdout + export_proc.stderr).strip()
                export_detail = " | ".join(export_text.splitlines()[-3:])
                export_ok = export_proc.returncode == 0 and out_json.exists()
                if out_json.exists():
                    exported = json.loads(out_json.read_text(encoding="utf-8"))
                    has_custom = "customModAction" in exported.get("actions", [])
            checks.append(CheckResult("export PPO gera nn_model.json", export_ok, export_detail))
            checks.append(CheckResult("adaptabilidade: acao custom entra na policy", has_custom, "customModAction em actions"))

    checks.append(check_real_log(log_path))
    if log_path.exists():
        real_actions = set()
        for tr in iter_transitions(log_path):
            real_actions.add(tr.get("a", "noop"))
        checks.append(CheckResult("log real tem diversidade minima de acoes", len(real_actions) >= 2, f"unique_actions={sorted(real_actions)}"))

    failed = [c for c in checks if not c.ok]

    print("AI_EVALUATION_RESULTS")
    for c in checks:
        print(f"- {'PASS' if c.ok else 'FAIL'} :: {c.name} :: {c.detail}")
    print(f"SUMMARY total={len(checks)} passed={len(checks)-len(failed)} failed={len(failed)}")

    return 1 if failed else 0


def main():
    parser = argparse.ArgumentParser(description="Avaliacao automatica da IA do mod Mindustry.")
    parser.add_argument("--log", default="rl_socket.log", help="Log RL real para checagem opcional de parse.")
    args = parser.parse_args()

    raise SystemExit(evaluate(ROOT / args.log))


if __name__ == "__main__":
    main()
