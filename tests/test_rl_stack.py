import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

from rl_common import DEFAULT_ACTIONS  # noqa: E402
from rl_data import convert_log_to_parquet, run_duckdb_query  # noqa: E402
from rl_env import IMPORT_ERROR, MindustryScenarioEnv  # noqa: E402


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
        self.assertGreaterEqual(len(payload.get("scenarios") or []), 3)

    @unittest.skipUnless(HAS_ENV_DEPS, "requires numpy + gymnasium")
    def test_scenario_env_is_deterministic_with_seed(self):
        env_a = MindustryScenarioEnv.from_file(SCENARIOS_PATH, seed=23)
        env_b = MindustryScenarioEnv.from_file(SCENARIOS_PATH, seed=23)
        actions = [2, 5, 3]

        traj_a = []
        obs, info = env_a.reset(seed=23, options={"scenario_name": "economy-bootstrap"})
        traj_a.append((obs.tolist(), info["scenario_name"]))
        for action in actions:
            obs, reward, terminated, truncated, step_info = env_a.step(action)
            traj_a.append((obs.tolist(), reward, terminated, truncated, step_info["selected_action"]))

        traj_b = []
        obs, info = env_b.reset(seed=23, options={"scenario_name": "economy-bootstrap"})
        traj_b.append((obs.tolist(), info["scenario_name"]))
        for action in actions:
            obs, reward, terminated, truncated, step_info = env_b.step(action)
            traj_b.append((obs.tolist(), reward, terminated, truncated, step_info["selected_action"]))

        self.assertEqual(traj_a, traj_b)

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

            stats = convert_log_to_parquet(log_path, parquet_path)
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
            self.assertTrue(model_path.exists())
            self.assertTrue(meta_path.exists())
            self.assertTrue(raw_path.exists())
            self.assertGreater(meta.get("eval_mean_reward", 0.0), 5.0)


if __name__ == "__main__":
    unittest.main()
