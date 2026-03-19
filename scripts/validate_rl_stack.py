import argparse
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description="Run the deterministic RL validation suite.")
    parser.add_argument("--quiet", action="store_true", help="Reduce unittest verbosity.")
    args = parser.parse_args()

    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"), pattern="test_rl_stack.py")
    runner = unittest.TextTestRunner(verbosity=1 if args.quiet else 2)
    result = runner.run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    sys.path.insert(0, str(ROOT / "scripts"))
    main()
