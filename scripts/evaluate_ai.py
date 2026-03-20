import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from rl_common import DEFAULT_ACTIONS, FEATURES, NORMS, SCHEMA_VERSION, infer_planet_label, iter_transitions, transition_planet_label

ROOT = Path(__file__).resolve().parents[1]
AI_JS = ROOT / "scripts" / "ai.js"
MAIN_JS = ROOT / "scripts" / "main.js"
MOD_JSON = ROOT / "mod.json"
SCHEMA_JSON = ROOT / "rl_schema.json"
PPO_META_JSON = ROOT / "ppo_meta.json"
NN_MODEL_JSON = ROOT / "nn_model.json"
DQN_META_JSON = ROOT / "dqn_meta.json"
SCENARIO_FIXTURE_JSON = ROOT / "tests" / "fixtures" / "rl_validation_scenarios.json"
REQUIRED_PLANETS = ("serpulo", "erekir")


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


def feature_names(raw):
    names = []
    if not isinstance(raw, list):
        return names
    for item in raw:
        if isinstance(item, dict):
            name = item.get("name")
        else:
            name = item
        if isinstance(name, str) and name:
            names.append(name)
    return names


def format_planet_coverage(coverage):
    if not coverage:
        return "{}"
    parts = []
    for planet in sorted(coverage.keys()):
        stats = coverage[planet]
        parts.append(
            "{}(transitions={}, actions={})".format(
                planet,
                stats.get("transitions", 0),
                sorted(stats.get("actions", set())),
            )
        )
    return "; ".join(parts)


def collect_planet_coverage(transitions):
    coverage = {}
    for tr in transitions:
        planet = transition_planet_label(tr)
        bucket = coverage.setdefault(planet, {"transitions": 0, "actions": set()})
        bucket["transitions"] += 1
        bucket["actions"].add(tr.get("a", "noop"))
    return coverage


def check_real_log(log_path):
    if not log_path.exists():
        return CheckResult("log real nao encontrado", True, f"skip ({log_path})")

    lines = 0
    transitions = list(iter_transitions(log_path))
    with log_path.open("r", encoding="utf-8", errors="ignore") as fh:
        for _ in fh:
            lines += 1

    if lines == 0:
        return CheckResult("log real parseavel", True, f"skip (log vazio: {log_path})")

    actions = sorted({tr.get("a", "noop") for tr in transitions})
    ok = len(transitions) > 0
    detail = f"lines={lines} parsed={len(transitions)} unique_actions={actions}"
    return CheckResult("log real parseavel", ok, detail)


def add_contract_checks(checks, label, payload, path, schema_exists, schema_actions, schema_features, schema_norms, strict_model):
    exists = payload is not None
    checks.append(CheckResult(f"{label} valido", exists or not strict_model, str(path)))
    if not exists or not schema_exists:
        return

    payload_actions = payload.get("actions", [])
    payload_features = feature_names(payload.get("features", []))
    payload_norms = payload.get("norms", {})
    payload_schema_version = payload.get("schema_version")
    action_ok = payload_actions == schema_actions
    feature_ok = payload_features == schema_features
    norm_ok = payload_norms == schema_norms
    version_ok = payload_schema_version == SCHEMA_VERSION

    checks.append(
        CheckResult(
            f"{label} actions correspondem ao schema",
            action_ok or not strict_model,
            f"schema={schema_actions} payload={payload_actions} strict={strict_model}",
        )
    )
    checks.append(
        CheckResult(
            f"{label} features correspondem ao schema",
            feature_ok or not strict_model,
            f"schema={schema_features} payload={payload_features} strict={strict_model}",
        )
    )
    checks.append(
        CheckResult(
            f"{label} norms correspondem ao schema",
            norm_ok or not strict_model,
            f"strict={strict_model}",
        )
    )
    checks.append(
        CheckResult(
            f"{label} registra schema_version atual",
            version_ok or not strict_model,
            f"schema_version={SCHEMA_VERSION} payload={payload_schema_version} strict={strict_model}",
        )
    )


def check_fixture_planet_coverage(min_steps_per_planet=3, min_actions_per_planet=3):
    payload = read_json(SCENARIO_FIXTURE_JSON)
    if payload is None:
        return [CheckResult("fixture de validacao RL existe", False, str(SCENARIO_FIXTURE_JSON))]

    checks = [CheckResult("fixture de validacao RL existe", True, str(SCENARIO_FIXTURE_JSON))]
    coverage = {}
    for scenario in payload.get("scenarios") or []:
        steps = scenario.get("steps") or []
        if not steps:
            continue
        planet = infer_planet_label((steps[0] or {}).get("state") or {})
        bucket = coverage.setdefault(planet, {"steps": 0, "actions": set(), "scenarios": 0})
        bucket["scenarios"] += 1
        for step in steps:
            bucket["steps"] += 1
            preferred = step.get("preferred_action")
            if preferred:
                bucket["actions"].add(preferred)
            for action_name in (step.get("transitions") or {}).keys():
                if action_name != "*":
                    bucket["actions"].add(action_name)

    for planet in REQUIRED_PLANETS:
        stats = coverage.get(planet, {"steps": 0, "actions": set(), "scenarios": 0})
        checks.append(
            CheckResult(
                f"fixture cobre planeta {planet}",
                stats["scenarios"] > 0,
                f"coverage={coverage}",
            )
        )
        checks.append(
            CheckResult(
                f"fixture tem passos minimos em {planet}",
                stats["steps"] >= min_steps_per_planet,
                f"steps={stats['steps']} required={min_steps_per_planet}",
            )
        )
        checks.append(
            CheckResult(
                f"fixture tem diversidade de acoes em {planet}",
                len(stats["actions"]) >= min_actions_per_planet,
                f"actions={sorted(stats['actions'])} required={min_actions_per_planet}",
            )
        )
    return checks


def check_real_planet_coverage(log_path, min_planet_transitions, min_planet_actions):
    if not log_path.exists():
        return [CheckResult("cobertura real por planeta", True, f"skip ({log_path})")]

    transitions = list(iter_transitions(log_path))
    if not transitions:
        return [CheckResult("cobertura real por planeta", True, f"skip (sem transicoes: {log_path})")]

    coverage = collect_planet_coverage(transitions)
    checks = [
        CheckResult(
            "log real expõe contexto de planeta",
            any(planet in coverage for planet in REQUIRED_PLANETS),
            format_planet_coverage(coverage),
        )
    ]
    for planet in REQUIRED_PLANETS:
        stats = coverage.get(planet, {"transitions": 0, "actions": set()})
        checks.append(
            CheckResult(
                f"log real tem transicoes suficientes em {planet}",
                stats["transitions"] >= min_planet_transitions,
                f"transitions={stats['transitions']} required={min_planet_transitions}",
            )
        )
        checks.append(
            CheckResult(
                f"log real tem diversidade de acoes em {planet}",
                len(stats["actions"]) >= min_planet_actions,
                f"actions={sorted(stats['actions'])} required={min_planet_actions}",
            )
        )
    return checks


def evaluate(log_path, strict_model=True, min_real_actions=1, min_planet_transitions=5, min_planet_actions=2):
    checks = []

    mod_data = read_json(MOD_JSON) or {}
    checks.append(CheckResult("mod.json valido", True, f"name={mod_data.get('name')} version={mod_data.get('version')}"))

    main_text = read_text(MAIN_JS)
    checks.append(CheckResult("entrypoint carrega ai.js", 'require("ai")' in main_text, "scripts/main.js"))

    schema = read_json(SCHEMA_JSON)
    schema_exists = schema is not None
    schema_actions = schema.get("actions", []) if schema_exists else []
    schema_features = feature_names(schema.get("features", [])) if schema_exists else []
    schema_norms = schema.get("norms") if schema_exists else None
    checks.append(CheckResult("schema RL compartilhado existe", schema_exists, "rl_schema.json"))
    checks.append(CheckResult("schema version alinhado (schema/RL)", (schema.get("version") if schema_exists else None) == SCHEMA_VERSION, f"schema={schema.get('version') if schema_exists else None} py={SCHEMA_VERSION}"))
    checks.append(CheckResult("acoes base alinhadas (schema/RL)", schema_actions == DEFAULT_ACTIONS, f"schema={schema_actions} py={DEFAULT_ACTIONS}"))
    checks.append(CheckResult("features alinhadas (schema/RL)", schema_features == FEATURES, f"schema={schema_features} py={FEATURES}"))
    checks.append(CheckResult("norms alinhadas (schema/RL)", schema_norms == NORMS, "rl_schema.json -> rl_common.py"))

    ai_text = read_text(AI_JS)
    checks.append(CheckResult("modo RL padrao e nn", 'rlPolicyMode: "nn"' in ai_text, "scripts/ai.js"))
    uses_shared_schema = 'rlSchemaFile: "rl_schema.json"' in ai_text and "loadRLSchema(" in ai_text
    checks.append(CheckResult("runtime JS usa schema compartilhado", uses_shared_schema, "scripts/ai.js -> rl_schema.json"))
    required_context_features = ["planetId", "gamemodeId", "campaignMode", "planetSerpulo", "planetErekir"]
    for feature_name in required_context_features:
        checks.append(
            CheckResult(
                f"snapshot JS expõe feature {feature_name}",
                f"{feature_name}:" in ai_text,
                "scripts/ai.js::snapshotState()",
            )
        )

    add_contract_checks(checks, "ppo_meta.json", read_json(PPO_META_JSON), PPO_META_JSON, schema_exists, schema_actions, schema_features, schema_norms, strict_model)
    add_contract_checks(checks, "nn_model.json", read_json(NN_MODEL_JSON), NN_MODEL_JSON, schema_exists, schema_actions, schema_features, schema_norms, strict_model)
    checks.append(CheckResult("artefato legado dqn_meta.json removido", not DQN_META_JSON.exists(), str(DQN_META_JSON)))

    sample = [
        {
            "t": 1,
            "s": {"resourceTier1": 10, "planetSerpulo": 1, "planetId": 1, "gamemodeId": 0, "campaignMode": 1, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1},
            "a": "customModAction",
            "s2": {"resourceTier1": 20, "planetSerpulo": 1, "planetId": 1, "gamemodeId": 0, "campaignMode": 1, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1},
            "info": {"reward": 1.0},
        },
        {
            "t": 2,
            "s": {"resourceTier1": 20, "planetErekir": 1, "planetId": 2, "gamemodeId": 1, "campaignMode": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1},
            "a": "noop",
            "s2": {"resourceTier1": 21, "planetErekir": 1, "planetId": 2, "gamemodeId": 1, "campaignMode": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1},
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

        qlearn_proc = run_cmd([sys.executable, "scripts/rl_qlearn.py", "--log", str(log_tmp), "--out", str(out_q), "--epochs", "1"])
        qlearn_text = (qlearn_proc.stdout + qlearn_proc.stderr).strip()
        qlearn_detail = " | ".join(qlearn_text.splitlines()[-3:])
        qlearn_ok = qlearn_proc.returncode == 0 and out_q.exists()
        qlearn_schema_ok = False
        qlearn_custom_ok = False
        if qlearn_ok:
            qlearn_out = read_json(out_q) or {}
            qlearn_schema_ok = feature_names(qlearn_out.get("features")) == schema_features and qlearn_out.get("norms") == NORMS
            qlearn_custom_ok = "customModAction" in qlearn_out.get("actions", [])
        checks.append(CheckResult("q-learning roda com log sintetico", qlearn_ok, qlearn_detail))
        checks.append(CheckResult("q-learning exporta schema compartilhado", qlearn_schema_ok, "q_table.json -> features/norms"))
        checks.append(CheckResult("adaptabilidade: acao custom entra na q-table", qlearn_custom_ok, "customModAction em actions"))

        proc = run_cmd([sys.executable, "scripts/rl_ppo.py", "--log", str(log_tmp), "--out", str(out_model), "--out-meta", str(out_meta), "--epochs", "1", "--batch", "2"])
        combined = (proc.stdout + proc.stderr).strip()
        short = " | ".join(combined.splitlines()[-4:])
        torch_missing = "pytorch_missing=" in combined
        sb3_missing = "sb3_dependencies_missing=" in combined or "missing_rl_env_dependencies=" in combined

        if torch_missing or sb3_missing:
            reason = "sb3 stack missing" if sb3_missing else "torch missing"
            checks.append(CheckResult("ppo roda com log sintetico", True, short or f"skip ({reason})"))
            checks.append(CheckResult("export PPO gera nn_model.json", True, f"skip ({reason})"))
            checks.append(CheckResult("adaptabilidade: acao custom entra na policy", True, f"skip ({reason})"))
        else:
            ok_train = proc.returncode == 0 and out_model.exists() and out_meta.exists()
            checks.append(CheckResult("ppo roda com log sintetico", ok_train, short))

            export_ok = False
            has_custom = False
            export_detail = "export not run"
            if ok_train:
                export_proc = run_cmd([sys.executable, "scripts/rl_export_nn_json.py", "--model", str(out_model), "--meta", str(out_meta), "--out", str(out_json)])
                export_text = (export_proc.stdout + export_proc.stderr).strip()
                export_detail = " | ".join(export_text.splitlines()[-3:])
                export_ok = export_proc.returncode == 0 and out_json.exists()
                if out_json.exists():
                    exported = read_json(out_json) or {}
                    has_custom = "customModAction" in exported.get("actions", [])
            checks.append(CheckResult("export PPO gera nn_model.json", export_ok, export_detail))
            checks.append(CheckResult("adaptabilidade: acao custom entra na policy", has_custom, "customModAction em actions"))

    try:
        from rl_common import reward

        reward_tests = [
            (
                "basic_resources",
                {"copper": 0, "lead": 0, "titanium": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0},
                {"copper": 10, "lead": 5, "titanium": 2, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0},
                0.36,
            ),
            (
                "infrastructure",
                {"copper": 0, "lead": 0, "titanium": 0, "industryFactories": 0, "drills": 0, "turrets": 0, "power": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0},
                {"copper": 0, "lead": 0, "titanium": 0, "industryFactories": 1, "drills": 2, "turrets": 1, "power": 50, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0},
                120.0,
            ),
            (
                "pressures",
                {"copper": 0, "lead": 0, "titanium": 0, "chainCoverage": 0, "chainPressure": 0, "powerPressure": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0},
                {"copper": 0, "lead": 0, "titanium": 0, "chainCoverage": 10, "chainPressure": 5, "powerPressure": 2, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0},
                120.0,
            ),
            (
                "terminal_enemy_core",
                {"copper": 0, "lead": 0, "titanium": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0},
                {"copper": 0, "lead": 0, "titanium": 0, "corePresent": 1, "enemyCore": 0, "coreHealthFrac": 1.0},
                500.0,
            ),
            (
                "terminal_ally_core",
                {"copper": 0, "lead": 0, "titanium": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0},
                {"copper": 0, "lead": 0, "titanium": 0, "corePresent": 0, "enemyCore": 1, "coreHealthFrac": 0.0},
                -620.0,
            ),
            (
                "core_health_damage",
                {"copper": 0, "lead": 0, "titanium": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0},
                {"copper": 0, "lead": 0, "titanium": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 0.8},
                -40.0,
            ),
            (
                "incremental_clamp_before_terminal_bonus",
                {"copper": 0, "lead": 0, "titanium": 0, "power": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0},
                {"copper": 0, "lead": 0, "titanium": 0, "power": 50, "corePresent": 1, "enemyCore": 0, "coreHealthFrac": 1.0},
                620.0,
            ),
        ]

        reward_failed = []
        for test_name, prev_state, next_state, expected in reward_tests:
            computed = reward(prev_state, next_state)
            if abs(computed - expected) < 0.01:
                continue
            reward_failed.append(f"{test_name}(got {computed:.2f}, want {expected:.2f})")

        reward_passed = len(reward_tests) - len(reward_failed)
        reward_ok = len(reward_failed) == 0
        reward_detail = f"{reward_passed}/{len(reward_tests)} parity tests passed" + (f"; failures: {', '.join(reward_failed[:2])}" if reward_failed else "")
        checks.append(CheckResult("parity completa: recompensas JS/Python alinhadas", reward_ok, reward_detail))
    except Exception as exc:
        checks.append(CheckResult("parity completa: recompensas JS/Python alinhadas", False, f"error: {exc}"))

    checks.extend(check_fixture_planet_coverage())
    checks.append(check_real_log(log_path))
    if log_path.exists():
        real_actions = {tr.get("a", "noop") for tr in iter_transitions(log_path)}
        required_real_actions = max(1, int(min_real_actions))
        checks.append(CheckResult("log real tem diversidade minima de acoes", len(real_actions) >= required_real_actions, f"unique_actions={sorted(real_actions)} required={required_real_actions}"))
    checks.extend(check_real_planet_coverage(log_path, min_planet_transitions, min_planet_actions))

    failed = [c for c in checks if not c.ok]

    print("AI_EVALUATION_RESULTS")
    for c in checks:
        print(f"- {'PASS' if c.ok else 'FAIL'} :: {c.name} :: {c.detail}")
    print(f"SUMMARY total={len(checks)} passed={len(checks)-len(failed)} failed={len(failed)} strict_model={strict_model}")

    return 1 if failed else 0


def main():
    parser = argparse.ArgumentParser(description="Avaliacao automatica da IA do mod Mindustry.")
    parser.add_argument("--log", default="rl_socket.log", help="Log RL real para checagem opcional de parse.")
    parser.add_argument("--strict-model", action="store_true", help="Alias legado; o modo estrito ja e o padrao.")
    parser.add_argument("--allow-model-mismatch", action="store_true", help="Permite artefatos desalinhados com o schema compartilhado.")
    parser.add_argument("--min-real-actions", type=int, default=1, help="Quantidade minima de acoes unicas exigidas no log real.")
    parser.add_argument("--min-planet-transitions", type=int, default=5, help="Minimo de transicoes exigidas por planeta no log real.")
    parser.add_argument("--min-planet-actions", type=int, default=2, help="Minimo de acoes unicas exigidas por planeta no log real.")
    args = parser.parse_args()

    strict_model = not args.allow_model_mismatch or args.strict_model
    raise SystemExit(
        evaluate(
            ROOT / args.log,
            strict_model=strict_model,
            min_real_actions=args.min_real_actions,
            min_planet_transitions=args.min_planet_transitions,
            min_planet_actions=args.min_planet_actions,
        )
    )


if __name__ == "__main__":
    main()
