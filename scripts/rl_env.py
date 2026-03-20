import json
from collections import defaultdict
from pathlib import Path

from rl_common import (
    DEFAULT_ACTIONS,
    FEATURES,
    encode_state,
    infer_planet_label,
    is_terminal_transition,
    load_transitions,
    reward_from_transition,
    split_episodes,
    vec_from_state,
)

try:
    import gymnasium as gym
    import numpy as np
except Exception as exc:
    gym = None
    np = None
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None


def missing_dependency_message():
    return "missing_rl_env_dependencies={} install='pip install gymnasium numpy'".format(IMPORT_ERROR)


def _slugify(value):
    text = str(value or "").strip()
    if not text:
        return "scenario"
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in text).strip("-") or "scenario"


def _build_transition_indexes(transitions, action_list):
    by_state_action = defaultdict(lambda: defaultdict(list))
    by_state_any = defaultdict(list)

    for tr in transitions:
        state = tr.get("s", {})
        key = encode_state(state)
        action = tr.get("a", "noop")
        if action not in action_list:
            action = "noop"
        by_state_action[key][action].append(tr)
        by_state_any[key].append(tr)

    return by_state_action, by_state_any


if gym is not None and np is not None:

    class MindustryDatasetEnv(gym.Env):
        metadata = {"render_modes": []}

        def __init__(self, transitions, action_list=None, max_episode_steps=256, seed=7, fallback_penalty=-0.25):
            super().__init__()
            self.transitions = list(transitions)
            self.action_list = list(action_list or DEFAULT_ACTIONS)
            self.action_index = {name: idx for idx, name in enumerate(self.action_list)}
            self.max_episode_steps = max(1, int(max_episode_steps or 256))
            self.fallback_penalty = float(fallback_penalty)
            self.episodes = split_episodes(self.transitions)
            self.episode_starts = [episode[0] for episode in self.episodes if episode]
            self.by_state_action, self.by_state_any = _build_transition_indexes(self.transitions, self.action_list)

            self.observation_space = gym.spaces.Box(
                low=-10.0,
                high=10.0,
                shape=(len(FEATURES),),
                dtype=np.float32,
            )
            self.action_space = gym.spaces.Discrete(len(self.action_list))

            self.current_state = None
            self.current_key = None
            self.current_episode_name = None
            self.steps = 0
            self.episode_reward = 0.0
            self._default_seed = int(seed)

        @classmethod
        def from_log(cls, log_path, limit=0, default_actions=None, max_episode_steps=256, seed=7):
            transitions, action_list, _ = load_transitions(log_path, limit=limit, default_actions=default_actions or DEFAULT_ACTIONS)
            return cls(
                transitions=transitions,
                action_list=action_list,
                max_episode_steps=max_episode_steps,
                seed=seed,
            )

        def _sample_start_transition(self):
            if not self.episode_starts:
                return None
            index = int(self.np_random.integers(0, len(self.episode_starts)))
            return self.episode_starts[index]

        def _set_state(self, state):
            self.current_state = dict(state or {})
            self.current_key = encode_state(self.current_state)

        def _obs(self):
            return np.asarray(vec_from_state(self.current_state or {}), dtype=np.float32)

        def reset(self, *, seed=None, options=None):
            if seed is not None:
                super().reset(seed=seed)
            options = options or {}

            if "state" in options:
                self._set_state(options.get("state") or {})
                source = "explicit_state"
            else:
                start = self._sample_start_transition()
                if start is None:
                    self._set_state({})
                    source = "empty"
                else:
                    self._set_state(start.get("s", {}))
                    source = "dataset"

            self.steps = 0
            self.episode_reward = 0.0
            info = {
                "reset_source": source,
                "seed": seed,
                "planet": infer_planet_label(self.current_state or {}),
            }
            return self._obs(), info

        def step(self, action):
            if self.current_state is None:
                raise RuntimeError("environment_not_reset")

            action_idx = int(action)
            action_name = self.action_list[action_idx]
            exact_candidates = self.by_state_action.get(self.current_key, {}).get(action_name) or []
            fallback_candidates = self.by_state_any.get(self.current_key, []) or []

            resolution = "exact"
            candidates = exact_candidates
            if not candidates:
                candidates = fallback_candidates
                resolution = "state_fallback"

            if not candidates:
                self.steps += 1
                self.episode_reward += self.fallback_penalty
                truncated = self.steps >= self.max_episode_steps
                info = {
                    "selected_action": action_name,
                    "resolution": "dead_end",
                    "transition_action": None,
                    "episode_reward": self.episode_reward,
                }
                return self._obs(), self.fallback_penalty, False, truncated, info

            choice = int(self.np_random.integers(0, len(candidates)))
            tr = candidates[choice]
            next_state = tr.get("s2", {}) or {}
            reward = float(reward_from_transition(tr))
            terminated = bool(is_terminal_transition(tr))

            self._set_state(next_state)
            self.steps += 1
            self.episode_reward += reward
            truncated = self.steps >= self.max_episode_steps and not terminated

            info = {
                "selected_action": action_name,
                "transition_action": tr.get("a", "noop"),
                "resolution": resolution,
                "matched_action": tr.get("a", "noop") == action_name,
                "episode_reward": self.episode_reward,
                "step_tick": tr.get("t"),
                "planet": infer_planet_label(next_state),
            }
            return self._obs(), reward, terminated, truncated, info


    class MindustryScenarioEnv(gym.Env):
        metadata = {"render_modes": []}

        def __init__(self, scenarios, action_list=None, max_episode_steps=0, seed=7):
            super().__init__()
            self.scenarios = [self._normalize_scenario(item) for item in scenarios]
            self.scenario_lookup = {item["name"]: item for item in self.scenarios}
            if not self.scenarios:
                raise ValueError("no_scenarios_defined")

            self.action_list = list(action_list or DEFAULT_ACTIONS)
            self.action_index = {name: idx for idx, name in enumerate(self.action_list)}
            self.max_episode_steps = int(max_episode_steps or max(item["max_steps"] for item in self.scenarios))
            self._default_seed = int(seed)

            self.observation_space = gym.spaces.Box(
                low=-10.0,
                high=10.0,
                shape=(len(FEATURES),),
                dtype=np.float32,
            )
            self.action_space = gym.spaces.Discrete(len(self.action_list))

            self.current_scenario = None
            self.current_step_index = 0
            self.current_state = None
            self.steps = 0
            self.episode_reward = 0.0

        @classmethod
        def from_file(cls, path, max_episode_steps=0, seed=7):
            payload = json.loads(Path(path).read_text(encoding="utf-8"))
            return cls(
                scenarios=payload.get("scenarios", []),
                action_list=payload.get("actions") or DEFAULT_ACTIONS,
                max_episode_steps=max_episode_steps,
                seed=payload.get("seed", seed),
            )

        def _normalize_scenario(self, raw):
            fallback_name = raw.get("id") or raw.get("label") or "scenario"
            name = raw.get("name") or _slugify(fallback_name)
            steps = []
            for idx, step in enumerate(raw.get("steps") or []):
                steps.append(
                    {
                        "index": idx,
                        "state": dict(step.get("state") or {}),
                        "preferred_action": step.get("preferred_action") or "",
                        "transitions": dict(step.get("transitions") or {}),
                        "default_reward": float(step.get("default_reward", 0.0)),
                    }
                )
            if not steps:
                raise ValueError("scenario_without_steps={}".format(name))
            return {
                "name": str(name),
                "steps": steps,
                "planet": infer_planet_label(steps[0]["state"]),
                "max_steps": int(raw.get("max_steps", len(steps))),
            }

        def _obs(self):
            return np.asarray(vec_from_state(self.current_state or {}), dtype=np.float32)

        def _select_scenario(self, options=None):
            options = options or {}
            name = options.get("scenario_name")
            if name:
                if name not in self.scenario_lookup:
                    raise KeyError("unknown_scenario={}".format(name))
                return self.scenario_lookup[name]

            index = options.get("scenario_index")
            if index is not None:
                return self.scenarios[int(index) % len(self.scenarios)]

            choice = int(self.np_random.integers(0, len(self.scenarios)))
            return self.scenarios[choice]

        def reset(self, *, seed=None, options=None):
            if seed is not None:
                super().reset(seed=seed)
            self.current_scenario = self._select_scenario(options=options)
            self.current_step_index = 0
            self.current_state = dict(self.current_scenario["steps"][0]["state"])
            self.steps = 0
            self.episode_reward = 0.0
            info = {
                "scenario_name": self.current_scenario["name"],
                "planet": self.current_scenario.get("planet", "unknown"),
                "seed": seed,
            }
            return self._obs(), info

        def step(self, action):
            if self.current_scenario is None:
                raise RuntimeError("environment_not_reset")

            step_def = self.current_scenario["steps"][self.current_step_index]
            action_name = self.action_list[int(action)]
            transitions = step_def.get("transitions") or {}
            outcome = transitions.get(action_name) or transitions.get("*") or {}

            next_step_index = self.current_step_index + 1
            has_next_step = next_step_index < len(self.current_scenario["steps"])
            next_state = outcome.get("next_state")
            if next_state is None and has_next_step:
                next_state = self.current_scenario["steps"][next_step_index].get("state") or {}
            if next_state is None:
                next_state = self.current_state

            reward = float(outcome.get("reward", step_def.get("default_reward", 0.0)))
            terminated = bool(outcome.get("terminated", not has_next_step))

            self.current_state = dict(next_state or {})
            self.steps += 1
            self.episode_reward += reward

            if has_next_step and not terminated:
                self.current_step_index = next_step_index

            truncated = self.steps >= self.max_episode_steps and not terminated
            info = {
                "scenario_name": self.current_scenario["name"],
                "planet": self.current_scenario.get("planet", "unknown"),
                "selected_action": action_name,
                "preferred_action": step_def.get("preferred_action") or "",
                "episode_reward": self.episode_reward,
                "resolution": "scenario",
            }
            return self._obs(), reward, terminated, truncated, info


else:

    class MindustryDatasetEnv:  # pragma: no cover - dependency error path
        def __init__(self, *args, **kwargs):
            raise RuntimeError(missing_dependency_message())

        @classmethod
        def from_log(cls, *args, **kwargs):
            raise RuntimeError(missing_dependency_message())


    class MindustryScenarioEnv:  # pragma: no cover - dependency error path
        def __init__(self, *args, **kwargs):
            raise RuntimeError(missing_dependency_message())

        @classmethod
        def from_file(cls, *args, **kwargs):
            raise RuntimeError(missing_dependency_message())
