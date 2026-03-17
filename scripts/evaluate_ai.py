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


def read(p):
    return p.read_text(encoding="utf-8", errors="ignore")


def extract_js_array(text, var_name):
    m = re.search(rf"{re.escape(var_name)}\s*:\s*\[(.*?)\]", text, re.S)
    if not m:
        return []
    body = m.group(1)
    return re.findall(r'"([^"]+)"', body)


def extract_js_features(text):
    m = re.search(r"features\s*:\s*\[(.*?)\]\s*};", text, re.S)
    if not m:
        return []
    body = m.group(1)
    return re.findall(r'name:\s*"([^"]+)"', body)


def extract_py_default_actions(text):
    m = re.search(r"DEFAULT_ACTIONS\s*=\s*\[(.*?)\]", text, re.S)
    if not m:
        return []
    return re.findall(r'"([^"]+)"', m.group(1))


def extract_qlearn_features(text):
    m = re.search(r"FEATURE_BUCKETS\s*=\s*\[(.*?)\]\n\n", text, re.S)
    if not m:
        return []
    return re.findall(r'\("([^"]+)"\s*,', m.group(1))


def extract_dqn_features(text):
    m = re.search(r"FEATURES\s*=\s*\[(.*?)\]", text, re.S)
    if not m:
        return []
    return re.findall(r'"([^"]+)"', m.group(1))


def run(cmd):
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)


def main():
    checks = []

    mod_data = json.loads(read(MOD_JSON))
    checks.append(("mod.json válido", True, f"name={mod_data.get('name')} version={mod_data.get('version')}") )

    main_text = read(MAIN_JS)
    checks.append(("entrypoint carrega ai.js", 'require("ai")' in main_text, "scripts/main.js"))

    ai_text = read(AI_JS)
    qlearn_text = read(QLEARN)
    dqn_text = read(DQN)

    js_actions = extract_js_array(ai_text, "actions")
    js_features = extract_js_features(ai_text)
    qlearn_actions = extract_py_default_actions(qlearn_text)
    dqn_actions = extract_py_default_actions(dqn_text)
    qlearn_features = extract_qlearn_features(qlearn_text)
    dqn_features = extract_dqn_features(dqn_text)

    checks.append(("ações base alinhadas (JS/Q-Learn)", js_actions == qlearn_actions, f"js={js_actions} py={qlearn_actions}"))
    checks.append(("ações base alinhadas (JS/DQN)", js_actions == dqn_actions, f"js={js_actions} py={dqn_actions}"))
    checks.append(("features alinhadas (JS/Q-Learn)", js_features == qlearn_features, f"js={js_features} py={qlearn_features}"))
    checks.append(("features alinhadas (JS/DQN)", js_features == dqn_features, f"js={js_features} py={dqn_features}"))

    # Adaptabilidade: ação custom de mod é absorvida no treino offline
    sample = [
        {"t": 1, "s": {"copper": 10, "lead": 10, "corePresent": 1, "enemyCore": 1}, "a": "customModAction", "s2": {"copper": 20, "lead": 10, "corePresent": 1, "enemyCore": 1}},
        {"t": 2, "s": {"copper": 20, "lead": 10, "corePresent": 1, "enemyCore": 1}, "a": "noop", "s2": {"copper": 20, "lead": 11, "corePresent": 1, "enemyCore": 1}},
    ]

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        log_path = td / "sample.log"
        out_path = td / "q_table.json"
        with log_path.open("w", encoding="utf-8") as f:
            for row in sample:
                f.write(json.dumps(row) + "\n")

        proc = run(["python3", "scripts/rl_qlearn.py", "--log", str(log_path), "--out", str(out_path), "--epochs", "1"])
        ok_train = proc.returncode == 0 and out_path.exists()
        details = (proc.stdout + proc.stderr).strip().splitlines()[-3:]
        checks.append(("qlearn roda com log sintético", ok_train, " | ".join(details)))

        has_custom = False
        if out_path.exists():
            data = json.loads(out_path.read_text(encoding="utf-8"))
            has_custom = "customModAction" in data.get("actions", [])
        checks.append(("adaptabilidade: ação custom entra na policy", has_custom, "customModAction em actions"))

    failed = [c for c in checks if not c[1]]

    print("AI_EVALUATION_RESULTS")
    for name, ok, detail in checks:
        print(f"- {'PASS' if ok else 'FAIL'} :: {name} :: {detail}")

    print(f"SUMMARY total={len(checks)} passed={len(checks)-len(failed)} failed={len(failed)}")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
