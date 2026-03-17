import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AI_JS = ROOT / "scripts" / "ai.js"
QLEARN = ROOT / "scripts" / "rl_qlearn.py"
DQN = ROOT / "scripts" / "rl_dqn.py"
MAIN_JS = ROOT / "scripts" / "main.js"
MOD_JSON = ROOT / "mod.json"


class CheckResult:
    def __init__(self, name, ok, detail):
        self.name = name
        self.ok = bool(ok)
        self.detail = detail



def read_text(path):
    return path.read_text(encoding="utf-8", errors="ignore")



def extract_js_actions(ai_text):
    m = re.search(r"actions\s*:\s*\[(.*?)\]", ai_text, re.S)
    if not m:
        return []
    return re.findall(r'"([^"]+)"', m.group(1))



def extract_js_feature_names(ai_text):
    start = ai_text.find("var rlQMeta =")
    if start < 0:
        return []

    end = ai_text.find("};", start)
    if end < 0:
        end = len(ai_text)

    block = ai_text[start:end]
    m = re.search(r"features\s*:\s*\[(.*?)\]\s*$", block, re.S | re.M)
    if not m:
        m = re.search(r"features\s*:\s*\[(.*?)\]", block, re.S)
        if not m:
            return []

    features_block = m.group(1)
    return re.findall(r'name\s*:\s*"([^"]+)"', features_block)



def extract_py_list(text, var_name):
    m = re.search(rf"{re.escape(var_name)}\s*=\s*\[(.*?)\]", text, re.S)
    if not m:
        return []
    return re.findall(r'"([^"]+)"', m.group(1))



def extract_qlearn_feature_names(text):
    m = re.search(r"FEATURE_BUCKETS\s*=\s*\[(.*?)\]\n\n", text, re.S)
    if not m:
        return []
    return re.findall(r'\("([^"]+)"\s*,', m.group(1))



def run_cmd(cmd):
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)



def check_real_log(log_path):
    if not log_path.exists():
        return CheckResult("log real não encontrado", True, f"skip ({log_path})")

    lines = 0
    parsed = 0
    actions = set()

    with log_path.open("r", encoding="utf-8", errors="ignore") as fh:
        for raw in fh:
            lines += 1
            line = raw.strip()
            if not line:
                continue
            payload = line.split("[RL]", 1)[1].strip() if "[RL]" in line else line
            try:
                tr = json.loads(payload)
            except json.JSONDecodeError:
                continue
            parsed += 1
            actions.add(tr.get("a", "noop"))

    if lines == 0:
        return CheckResult("log real parseável", True, f"skip (log vazio: {log_path})")

    ok = parsed > 0
    detail = f"lines={lines} parsed={parsed} unique_actions={sorted(actions)}"
    return CheckResult("log real parseável", ok, detail)



def evaluate(log_path):
    checks = []

    mod_data = json.loads(read_text(MOD_JSON))
    checks.append(CheckResult("mod.json válido", True, f"name={mod_data.get('name')} version={mod_data.get('version')}"))

    main_text = read_text(MAIN_JS)
    checks.append(CheckResult("entrypoint carrega ai.js", 'require("ai")' in main_text, "scripts/main.js"))

    ai_text = read_text(AI_JS)
    qlearn_text = read_text(QLEARN)
    dqn_text = read_text(DQN)

    js_actions = extract_js_actions(ai_text)
    js_features = extract_js_feature_names(ai_text)
    qlearn_actions = extract_py_list(qlearn_text, "DEFAULT_ACTIONS")
    dqn_actions = extract_py_list(dqn_text, "DEFAULT_ACTIONS")
    qlearn_features = extract_qlearn_feature_names(qlearn_text)
    dqn_features = extract_py_list(dqn_text, "FEATURES")

    checks.append(CheckResult("ações base alinhadas (JS/Q-Learn)", js_actions == qlearn_actions, f"js={js_actions} py={qlearn_actions}"))
    checks.append(CheckResult("ações base alinhadas (JS/DQN)", js_actions == dqn_actions, f"js={js_actions} py={dqn_actions}"))
    checks.append(CheckResult("features alinhadas (JS/Q-Learn)", js_features == qlearn_features, f"js={js_features} py={qlearn_features}"))
    checks.append(CheckResult("features alinhadas (JS/DQN)", js_features == dqn_features, f"js={js_features} py={dqn_features}"))

    # Adaptabilidade: ação custom de mod entra automaticamente no treino
    sample = [
        {"t": 1, "s": {"copper": 10, "lead": 10, "corePresent": 1, "enemyCore": 1}, "a": "customModAction", "s2": {"copper": 20, "lead": 10, "corePresent": 1, "enemyCore": 1}},
        {"t": 2, "s": {"copper": 20, "lead": 10, "corePresent": 1, "enemyCore": 1}, "a": "noop", "s2": {"copper": 20, "lead": 11, "corePresent": 1, "enemyCore": 1}},
    ]

    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        log_tmp = td_path / "sample.log"
        out_q = td_path / "q_table.json"

        with log_tmp.open("w", encoding="utf-8") as fh:
            for row in sample:
                fh.write(json.dumps(row) + "\n")

        proc = run_cmd(["python3", "scripts/rl_qlearn.py", "--log", str(log_tmp), "--out", str(out_q), "--epochs", "1"])
        ok_train = proc.returncode == 0 and out_q.exists()
        short = " | ".join((proc.stdout + proc.stderr).strip().splitlines()[-3:])
        checks.append(CheckResult("qlearn roda com log sintético", ok_train, short))

        has_custom = False
        if out_q.exists():
            q_data = json.loads(out_q.read_text(encoding="utf-8"))
            has_custom = "customModAction" in q_data.get("actions", [])
        checks.append(CheckResult("adaptabilidade: ação custom entra na policy", has_custom, "customModAction em actions"))

    checks.append(check_real_log(log_path))

    failed = [c for c in checks if not c.ok]

    print("AI_EVALUATION_RESULTS")
    for c in checks:
        print(f"- {'PASS' if c.ok else 'FAIL'} :: {c.name} :: {c.detail}")
    print(f"SUMMARY total={len(checks)} passed={len(checks)-len(failed)} failed={len(failed)}")

    return 1 if failed else 0



def main():
    parser = argparse.ArgumentParser(description="Avaliação automática da IA do mod Mindustry.")
    parser.add_argument("--log", default="rl_socket.log", help="Log RL real para checagem opcional de parse.")
    args = parser.parse_args()

    raise SystemExit(evaluate(ROOT / args.log))


if __name__ == "__main__":
    main()
