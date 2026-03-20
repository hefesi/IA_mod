import json
import socket
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

from rl_common import DEFAULT_ACTIONS, FEATURES, SCHEMA_VERSION, encode_state, infer_planet_label  # noqa: E402
from rl_data import convert_log_to_parquet, run_duckdb_query  # noqa: E402
from rl_env import IMPORT_ERROR, MindustryScenarioEnv  # noqa: E402
from rl_socket_server import handle_connection  # noqa: E402


SCENARIOS_PATH = ROOT / "tests" / "fixtures" / "rl_validation_scenarios.json"


def module_available(name):
    try:
        __import__(name)
        return True
    except Exception:
        return False


HAS_ENV_DEPS = module_available("numpy") and module_available("gymnasium") and IMPORT_ERROR is None
HAS_DATA_DEPS = module_available("pyarrow") and module_available("duckdb")
HAS_SB3_DEPS = HAS_ENV_DEPS and module_available("torch") and module_available("stable_baselines3")


class RLStackTests(unittest.TestCase):
    def test_scenario_fixture_matches_schema_actions(self):
        payload = json.loads(SCENARIOS_PATH.read_text(encoding="utf-8"))
        self.assertEqual(payload.get("actions"), DEFAULT_ACTIONS)
        self.assertGreaterEqual(len(payload.get("scenarios") or []), 4)

    def test_scenario_fixture_covers_both_planets(self):
        payload = json.loads(SCENARIOS_PATH.read_text(encoding="utf-8"))
        coverage = {}
        for scenario in payload.get("scenarios") or []:
            steps = scenario.get("steps") or []
            self.assertTrue(steps, f"scenario without steps: {scenario.get('name')}")
            planet = infer_planet_label((steps[0] or {}).get("state") or {})
            coverage.setdefault(planet, []).append(scenario.get("name"))

        self.assertIn("serpulo", coverage)
        self.assertIn("erekir", coverage)
        self.assertGreaterEqual(len(coverage["serpulo"]), 2)
        self.assertGreaterEqual(len(coverage["erekir"]), 2)

    @unittest.skipUnless(HAS_ENV_DEPS, "requires numpy + gymnasium")
    def test_scenario_env_is_deterministic_with_seed(self):
        env_a = MindustryScenarioEnv.from_file(SCENARIOS_PATH, seed=23)
        env_b = MindustryScenarioEnv.from_file(SCENARIOS_PATH, seed=23)
        actions = [2, 5, 3]

        traj_a = []
        obs, info = env_a.reset(seed=23, options={"scenario_name": "economy-bootstrap"})
        traj_a.append((obs.tolist(), info["scenario_name"], info["planet"]))
        for action in actions:
            obs, reward, terminated, truncated, step_info = env_a.step(action)
            traj_a.append((obs.tolist(), reward, terminated, truncated, step_info["selected_action"], step_info["planet"]))

        traj_b = []
        obs, info = env_b.reset(seed=23, options={"scenario_name": "economy-bootstrap"})
        traj_b.append((obs.tolist(), info["scenario_name"], info["planet"]))
        for action in actions:
            obs, reward, terminated, truncated, step_info = env_b.step(action)
            traj_b.append((obs.tolist(), reward, terminated, truncated, step_info["selected_action"], step_info["planet"]))

        self.assertEqual(traj_a, traj_b)
        self.assertEqual(traj_a[0][2], "serpulo")

    @unittest.skipUnless(HAS_ENV_DEPS, "requires numpy + gymnasium")
    def test_scenario_env_exposes_planet_context(self):
        env = MindustryScenarioEnv.from_file(SCENARIOS_PATH, seed=11)

        _, info = env.reset(seed=11, options={"scenario_name": "erekir-supply-ramp"})
        self.assertEqual(info["planet"], "erekir")

        _, _, _, _, step_info = env.step(DEFAULT_ACTIONS.index("mine"))
        self.assertEqual(step_info["planet"], "erekir")

    @unittest.skipUnless(HAS_DATA_DEPS, "requires pyarrow + duckdb")
    def test_parquet_and_duckdb_roundtrip(self):
        sample_rows = [
            {
                "t": 1,
                "s": {"resourceTier1": 10, "corePresent": 1, "enemyCore": 1},
                "a": "mine",
                "s2": {"resourceTier1": 40, "corePresent": 1, "enemyCore": 1},
                "info": {"reward": 3.5},
            },
            {
                "t": 2,
                "s": {"resourceTier1": 40, "corePresent": 1, "enemyCore": 1},
                "a": "industry",
                "s2": {"resourceTier1": 30, "factoryCapacity": 2, "corePresent": 1, "enemyCore": 1},
                "info": {"reward": 7.0},
            },
            {
                "t": 3,
                "s": {"resourceTier1": 30, "factoryCapacity": 2, "corePresent": 1, "enemyCore": 1},
                "a": "attackWave",
                "s2": {"resourceTier1": 20, "factoryCapacity": 2, "corePresent": 1, "enemyCore": 0},
                "info": {"reward": 25.0, "terminal": True},
            },
        ]

        with tempfile.TemporaryDirectory() as td:
            td_path = Path(td)
            log_path = td_path / "sample.log"
            parquet_path = td_path / "sample.parquet"
            with log_path.open("w", encoding="utf-8") as fh:
                for row in sample_rows:
                    fh.write(json.dumps(row) + "\n")

            stats = convert_log_to_parquet(log_path, parquet_path, batch_size=2)
            self.assertEqual(stats["rows"], 3)
            counts = run_duckdb_query(
                parquet_path,
                "select count(*) as rows, cast(sum(case when terminal then 1 else 0 end) as integer) as terminal_rows from dataset",
            )
            actions = run_duckdb_query(
                parquet_path,
                "select action from dataset order by tick asc",
            )

            self.assertEqual(counts, [(3, 1)])
            self.assertEqual(actions, [("mine",), ("industry",), ("attackWave",)])

    def test_qlearn_terminal_transition_uses_immediate_reward_target(self):
        state_terminal = {"resourceTier1": 100, "corePresent": 1, "enemyCore": 0, "coreHealthFrac": 1.0}
        state_start = {"resourceTier1": 0, "corePresent": 1, "enemyCore": 1, "coreHealthFrac": 1.0}
        sample_rows = [
            {
                "t": 1,
                "s": state_terminal,
                "a": "noop",
                "s2": state_terminal,
                "info": {"reward": 10.0},
            },
            {
                "t": 2,
                "s": state_start,
                "a": "attackWave",
                "s2": state_terminal,
                "info": {"reward": 1.0, "terminal": True},
            },
        ]

        with tempfile.TemporaryDirectory() as td:
            td_path = Path(td)
            log_path = td_path / "sample.log"
            out_path = td_path / "q_table.json"
            with log_path.open("w", encoding="utf-8") as fh:
                for row in sample_rows:
                    fh.write(json.dumps(row) + "\n")

            proc = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts" / "rl_qlearn.py"),
                    "--log",
                    str(log_path),
                    "--out",
                    str(out_path),
                    "--epochs",
                    "1",
                    "--alpha",
                    "1.0",
                    "--gamma",
                    "0.9",
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
            )
            if proc.returncode != 0:
                self.fail(proc.stdout + "\n" + proc.stderr)

            payload = json.loads(out_path.read_text(encoding="utf-8"))
            key = ",".join(map(str, encode_state(state_start)))
            action_index = payload["actions"].index("attackWave")
            self.assertAlmostEqual(payload["q"][key][action_index], 1.0, places=6)

    def test_socket_stop_event_with_token_enabled(self):
        with tempfile.TemporaryDirectory() as td:
            td_path = Path(td)
            log_path = td_path / "socket.log"
            server_sock, client_sock = socket.socketpair()
            global_state = {"total_transitions": 0, "max_transitions": 0, "max_remaining": 0}
            result = {}

            def run_server():
                result["value"] = handle_connection(
                    server_sock,
                    ("local", 0),
                    log_path,
                    False,
                    global_state,
                    required_token="secret-token",
                    stop_on_event="gameOver",
                    recv_timeout=0.5,
                    max_line_size=4096,
                )

            thread = threading.Thread(target=run_server)
            thread.start()
            try:
                invalid_payload = {"type": "event", "event": "gameOver", "t": 1, "data": {"kind": "invalid"}}
                valid_payload = {"type": "event", "event": "gameOver", "t": 2, "token": "secret-token", "data": {"kind": "valid"}}
                client_sock.sendall((json.dumps(invalid_payload) + "\n").encode("utf-8"))
                client_sock.sendall((json.dumps(valid_payload) + "\n").encode("utf-8"))
            finally:
                client_sock.close()

            thread.join(timeout=2)
            self.assertFalse(thread.is_alive(), "socket handler did not stop on authenticated event")
            self.assertEqual(result.get("value"), (0, "gameOver"))
            self.assertEqual(global_state["total_transitions"], 0)
            self.assertEqual(log_path.read_text(encoding="utf-8"), "")

    @unittest.skipUnless(HAS_SB3_DEPS, "requires stable-baselines3 stack")
    def test_sb3_ppo_smoke_training_on_fixed_scenarios(self):
        with tempfile.TemporaryDirectory() as td:
            td_path = Path(td)
            model_path = td_path / "ppo_model.pt"
            meta_path = td_path / "ppo_meta.json"
            raw_path = td_path / "ppo_model.zip"
            cmd = [
                sys.executable,
                str(ROOT / "scripts" / "rl_ppo.py"),
                "--env",
                "scenarios",
                "--scenarios",
                str(SCENARIOS_PATH),
                "--out",
                str(model_path),
                "--out-meta",
                str(meta_path),
                "--out-sb3",
                str(raw_path),
                "--epochs",
                "2",
                "--n-steps",
                "48",
                "--batch",
                "16",
                "--eval-episodes",
                "3",
                "--seed",
                "19",
            ]
            proc = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
            if proc.returncode != 0:
                self.fail(proc.stdout + "\n" + proc.stderr)

            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            self.assertEqual(meta.get("algorithm"), "stable-baselines3-ppo")
            self.assertEqual(meta.get("env_mode"), "scenarios")
            self.assertEqual(meta.get("schema_version"), SCHEMA_VERSION)
            self.assertEqual(meta.get("features"), FEATURES)
            self.assertEqual(meta.get("actions"), DEFAULT_ACTIONS)
            self.assertIn("serpulo", meta.get("planet_coverage", {}))
            self.assertIn("erekir", meta.get("planet_coverage", {}))
            self.assertGreater(meta["planet_coverage"]["serpulo"].get("transitions", 0), 0)
            self.assertGreater(meta["planet_coverage"]["erekir"].get("transitions", 0), 0)
            self.assertTrue(model_path.exists())
            self.assertTrue(meta_path.exists())
            self.assertTrue(raw_path.exists())
            self.assertGreater(meta.get("eval_mean_reward", 0.0), 5.0)


if __name__ == "__main__":
    unittest.main()
