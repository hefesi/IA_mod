import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "rl_schema.json"


def load_schema(path=SCHEMA_PATH):
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    actions = raw.get("actions")
    features = raw.get("features")
    norms = raw.get("norms")
    if not isinstance(actions, list):
        raise ValueError("invalid_rl_schema: actions must be a list")
    if not isinstance(features, list):
        raise ValueError("invalid_rl_schema: features must be a list")
    if not isinstance(norms, dict):
        raise ValueError("invalid_rl_schema: norms must be an object")

    normalized_features = []
    for idx, feature in enumerate(features):
        if not isinstance(feature, dict):
            raise ValueError("invalid_rl_schema: feature[{}] must be an object".format(idx))
        name = feature.get("name")
        bins = feature.get("bins", [])
        if not isinstance(name, str) or not name:
            raise ValueError("invalid_rl_schema: feature[{}].name must be a non-empty string".format(idx))
        if not isinstance(bins, list):
            raise ValueError("invalid_rl_schema: feature[{}].bins must be a list".format(idx))
        normalized_features.append({"name": name, "bins": list(bins)})

    return {
        "version": raw.get("version", 1),
        "actions": list(actions),
        "features": normalized_features,
        "norms": dict(norms),
    }


SCHEMA = load_schema()
DEFAULT_ACTIONS = list(SCHEMA["actions"])
FEATURE_DEFS = [{"name": feature["name"], "bins": list(feature["bins"])} for feature in SCHEMA["features"]]
FEATURE_BUCKETS = [(feature["name"], list(feature["bins"])) for feature in FEATURE_DEFS]
FEATURES = [feature["name"] for feature in FEATURE_DEFS]
NORMS = dict(SCHEMA["norms"])


def num(d, key):
    try:
        return float(d.get(key, 0))
    except Exception:
        return 0.0


def reward(s, s2):
    r = 0.0
    r += 0.005 * (num(s2, "copper") - num(s, "copper"))
    r += 0.007 * (num(s2, "lead") - num(s, "lead"))
    r += 0.02 * (num(s2, "titanium") - num(s, "titanium"))
    r += 0.004 * (num(s2, "resourceTier1") - num(s, "resourceTier1"))
    r += 0.006 * (num(s2, "resourceTier2") - num(s, "resourceTier2"))
    r += 0.01 * (num(s2, "resourceTier3") - num(s, "resourceTier3"))
    r += 0.014 * (num(s2, "resourceTier4") - num(s, "resourceTier4"))
    r += 0.018 * (num(s2, "resourceTier5") - num(s, "resourceTier5"))
    r += 0.005 * (num(s2, "resourceIndustrial") - num(s, "resourceIndustrial"))
    r += 0.008 * (num(s2, "resourceStrategic") - num(s, "resourceStrategic"))
    r += 0.004 * (num(s2, "combatStock") - num(s, "combatStock"))
    r += 3.0 * (num(s2, "industryFactories") - num(s, "industryFactories"))
    r += 10.0 * (num(s2, "economyStage") - num(s, "economyStage"))
    r += 2.0 * (num(s2, "drills") - num(s, "drills"))
    r += 4.0 * (num(s2, "turrets") - num(s, "turrets"))
    r += 1.5 * (num(s2, "power") - num(s, "power"))
    r += 1.5 * (num(s2, "factoryCapacity") - num(s, "factoryCapacity"))
    r += 1.8 * (num(s2, "upgradeCapacity") - num(s, "upgradeCapacity"))
    r += 0.4 * (num(s2, "factoryVariety") - num(s, "factoryVariety"))
    r += 0.08 * (num(s2, "unitCapacity") - num(s, "unitCapacity"))
    r += 25.0 * (num(s2, "chainCoverage") - num(s, "chainCoverage"))
    r -= 18.0 * (num(s2, "chainPressure") - num(s, "chainPressure"))
    r -= 14.0 * (num(s2, "powerPressure") - num(s, "powerPressure"))
    r -= 12.0 * (num(s2, "defensePressure") - num(s, "defensePressure"))
    r -= 8.0 * (num(s2, "liquidPressure") - num(s, "liquidPressure"))
    r -= 8.0 * (num(s2, "ammoPressureKinetic") - num(s, "ammoPressureKinetic"))
    r -= 9.0 * (num(s2, "ammoPressureExplosive") - num(s, "ammoPressureExplosive"))
    r -= 9.0 * (num(s2, "ammoPressureEnergy") - num(s, "ammoPressureEnergy"))
    r += 6.0 * max(0.0, num(s, "enemies") - num(s2, "enemies"))
    r -= 1.5 * max(0.0, num(s, "unitsTotal") - num(s2, "unitsTotal"))
    r += 50.0 * (num(s2, "coreHealthFrac") - num(s, "coreHealthFrac"))
    if num(s, "enemyCore") == 1 and num(s2, "enemyCore") == 0:
        r += 200.0
    if num(s, "corePresent") == 1 and num(s2, "corePresent") == 0:
        r -= 250.0
    return r


def reward_from_transition(tr):
    info = tr.get("info") or {}
    try:
        if "reward" in info and info.get("reward") is not None:
            return float(info.get("reward"))
    except Exception:
        pass
    return reward(tr.get("s", {}), tr.get("s2", {}))


def is_terminal_transition(tr):
    info = tr.get("info") or {}
    try:
        if bool(info.get("terminal")):
            return True
    except Exception:
        pass
    s = tr.get("s", {})
    s2 = tr.get("s2", {})
    if num(s, "enemyCore") == 1 and num(s2, "enemyCore") == 0:
        return True
    if num(s, "corePresent") == 1 and num(s2, "corePresent") == 0:
        return True
    return False


def vec_from_state(s):
    vec = []
    for name in FEATURES:
        v = num(s, name)
        n = NORMS.get(name, 1.0)
        if n <= 0:
            n = 1.0
        v = max(-10.0, min(10.0, v / n))
        vec.append(v)
    return vec


def iter_transitions(log_path, limit=0):
    count = 0
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            payload = line.split("[RL]", 1)[1].strip() if "[RL]" in line else line.strip()
            if not payload:
                continue
            try:
                tr = json.loads(payload)
            except json.JSONDecodeError:
                continue
            if not isinstance(tr, dict):
                continue
            if tr.get("type") == "event":
                continue
            yield tr
            count += 1
            if limit and count >= limit:
                break


def build_action_list(transitions, default_actions=None):
    actions = set(default_actions or DEFAULT_ACTIONS)
    for tr in transitions:
        actions.add(tr.get("a", "noop"))
    base = list(default_actions or DEFAULT_ACTIONS)
    return base + sorted(a for a in actions if a not in base)


def load_transitions(log_path, limit=0, default_actions=None):
    transitions = list(iter_transitions(log_path, limit=limit))
    action_list = build_action_list(transitions, default_actions=default_actions)
    action_index = {a: i for i, a in enumerate(action_list)}
    return transitions, action_list, action_index
