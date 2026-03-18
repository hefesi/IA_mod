import argparse
import json
import sys


def load_state_dict(path):
    try:
        import torch
    except Exception as exc:
        print("pytorch_missing={}".format(exc))
        print("install=torch (pip install torch)")
        sys.exit(1)

    sd = torch.load(path, map_location="cpu")
    if isinstance(sd, dict) and "state_dict" in sd and isinstance(sd["state_dict"], dict):
        sd = sd["state_dict"]
    if not isinstance(sd, dict):
        raise ValueError("invalid_state_dict")
    return sd


def extract_linear_layers(sd, prefix="net"):
    idxs = set()
    for key in sd.keys():
        if not key.endswith(".weight"):
            continue
        parts = key.split(".")
        if len(parts) < 2:
            continue
        if prefix and parts[0] != prefix:
            continue
        idx_part = parts[-2]
        if idx_part.isdigit():
            idxs.add(int(idx_part))
    layers = []
    for idx in sorted(idxs):
        w_key = "{}.{}.weight".format(prefix, idx) if prefix else "{}.weight".format(idx)
        b_key = "{}.{}.bias".format(prefix, idx) if prefix else "{}.bias".format(idx)
        w = sd.get(w_key)
        b = sd.get(b_key)
        if w is None or b is None:
            continue
        if len(w.shape) != 2:
            continue
        layers.append((w, b))
    if not layers:
        raise ValueError("no_linear_layers_found")
    return layers


def main():
    parser = argparse.ArgumentParser(description="Export PyTorch policy checkpoint to Mindustry nn_model.json format.")
    parser.add_argument("--model", required=True, help="Path to .pt state_dict.")
    parser.add_argument("--meta", required=True, help="Path to meta JSON (actions/features/norms).")
    parser.add_argument("--out", default="nn_model.json", help="Output JSON for the mod.")
    parser.add_argument("--prefix", default="", help="State dict prefix for the policy head. Defaults to meta.policy_prefix or auto-detect.")
    parser.add_argument("--hidden-act", default="relu", help="Activation for hidden layers (default: relu).")
    args = parser.parse_args()

    sd = load_state_dict(args.model)
    with open(args.meta, "r", encoding="utf-8") as f:
        meta = json.load(f)

    prefix = args.prefix or meta.get("policy_prefix") or ""
    if not prefix:
        if any(key.startswith("policy_net.") for key in sd.keys()):
            prefix = "policy_net"
        else:
            prefix = "net"

    layers = extract_linear_layers(sd, prefix=prefix)

    out_layers = []
    for i, (w, b) in enumerate(layers):
        act = args.hidden_act if i < len(layers) - 1 else "none"
        out_layers.append(
            {
                "in": int(w.shape[1]),
                "out": int(w.shape[0]),
                "w": w.reshape(-1).tolist(),
                "b": b.reshape(-1).tolist(),
                "act": act,
            }
        )

    payload = {
        "format": "layers-v1",
        "algorithm": meta.get("algorithm", "policy-network"),
        "policy": meta.get("policy", "categorical"),
        "output": meta.get("output", "logits"),
        "readOnly": True,
        "layers": out_layers,
        "features": meta.get("features"),
        "actions": meta.get("actions"),
        "norms": meta.get("norms"),
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f)

    print("saved_json={}".format(args.out))


if __name__ == "__main__":
    main()
