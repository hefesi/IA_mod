import argparse
import json
import socket
import time

from rl_common import reward_from_transition


def socket_event_name(payload):
    if not isinstance(payload, dict):
        return None
    if payload.get("type") != "event":
        return None
    name = payload.get("event")
    if not isinstance(name, str) or not name:
        return None
    return name


def payload_has_valid_token(payload, required_token):
    if not required_token:
        return True
    if not isinstance(payload, dict):
        return False
    return payload.get("token") == required_token


def handle_connection(conn, addr, out_path, verbose, global_state, required_token="", allowlist=None, stop_on_event="", recv_timeout=30, max_line_size=65536):
        # Invalid payload diagnostics
        invalid_payload_count = 0
        last_invalid_log_time = 0

    """
    Handle a single client connection with optional token authentication.
    
    Args:
        conn: socket connection
        addr: client address
        out_path: path to output log file
        verbose: whether to print per-transition rewards
        global_state: dict with 'total_transitions' counter (mutated in-place)
        required_token: if set, clients must include this token in payload metadata
        allowlist: list of allowed client IPs (None = allow all)
        stop_on_event: name of event that triggers server stop
        recv_timeout: per-connection receive timeout in seconds
        max_line_size: maximum buffered line size before reset
    
    Returns:
        tuple of (connection_transitions, stop_event_name)
    """
    client_ip = addr[0] if isinstance(addr, tuple) else str(addr)
    if max_line_size <= 0:
        raise ValueError("max_line_size must be > 0")

    # Check IP allowlist if specified
    if allowlist is not None and len(allowlist) > 0:
        if client_ip not in allowlist:
            if verbose:
                print("client_rejected_not_in_allowlist client_ip={}".format(client_ip))
            conn.close()
            return 0, None
    
    buf = ""
    count = 0
    total = 0.0
    max_remaining = global_state.get("max_remaining", 0)
    
    with conn, open(out_path, "a", encoding="utf-8") as f:
        if recv_timeout and recv_timeout > 0:
            conn.settimeout(recv_timeout)
        else:
            conn.settimeout(None)
        if verbose:
            print("client_connected={} global_total={}".format(addr, global_state["total_transitions"]))
        while True:
            # Check if we've hit the global limit
            if max_remaining > 0 and global_state["total_transitions"] >= global_state["max_transitions"]:
                if verbose:
                    print("global_max_transitions_reached")
                break

            try:
                data = conn.recv(4096)
            except socket.timeout:
                print("client_recv_timeout client_ip={} recv_timeout={} closing_connection".format(client_ip, recv_timeout))
                break
            except OSError as exc:
                print("client_recv_error client_ip={} error={} closing_connection".format(client_ip, exc))
                break
            if not data:
                break
            buf += data.decode("utf-8", errors="ignore")
            while "\n" in buf:
                raw_line, buf = buf.split("\n", 1)
                if len(raw_line) > max_line_size:
                    print("client_line_limit_exceeded client_ip={} line_chars={} max_line_size={} closing_connection".format(
                        client_ip, len(raw_line), max_line_size))
                    buf = ""
                    return count, None
                line = raw_line.strip()
                if not line:
                    continue
                try:
                    tr = json.loads(line)
                except json.JSONDecodeError:
                    invalid_payload_count += 1
                    now = time.time()
                    if now - last_invalid_log_time > 10:
                        print(f"invalid_payload_rejected reason=json_decode client_ip={client_ip} count={invalid_payload_count}")
                        last_invalid_log_time = now
                    continue

                # Validate payload type before token/event logic
                if not isinstance(tr, dict):
                    invalid_payload_count += 1
                    now = time.time()
                    if now - last_invalid_log_time > 10:
                        print(f"invalid_payload_rejected reason=not_dict client_ip={client_ip} count={invalid_payload_count}")
                        last_invalid_log_time = now
                    continue

                # Check token if required
                if not payload_has_valid_token(tr, required_token):
                    if verbose:
                        print("payload_rejected_invalid_token client_ip={}".format(client_ip))
                    continue

                event_name = socket_event_name(tr)
                if event_name is not None:
                    if verbose:
                        print("event={} t={}".format(event_name, tr.get("t")))
                    if stop_on_event and event_name == stop_on_event:
                        return count, event_name
                    continue
                # Strict contract validation for non-event records
                def is_valid_transition(payload):
                    # Required fields and types
                    required = ["type", "s", "a", "s2", "info", "t"]
                    if not isinstance(payload, dict):
                        return False, "not_dict"
                    for k in required:
                        if k not in payload:
                            return False, f"missing_{k}"
                    if payload["type"] not in ("transition", "micro"):
                        return False, "bad_type"
                    if not isinstance(payload["s"], dict):
                        return False, "s_not_dict"
                    if not isinstance(payload["s2"], dict):
                        return False, "s2_not_dict"
                    # Only allow non-empty string actions
                    if not (isinstance(payload["a"], str) and payload["a"]):
                        return False, "a_not_string"
                    if not isinstance(payload["info"], dict):
                        return False, "info_not_dict"
                    if not (isinstance(payload["t"], int) and payload["t"] >= 0):
                        return False, "t_bad"
                    return True, "ok"

                valid, reason = is_valid_transition(tr)
                if not valid:
                    invalid_payload_count += 1
                    now = time.time()
                    # Log at most once per 10s
                    if now - last_invalid_log_time > 10:
                        print(f"invalid_payload_rejected reason={reason} client_ip={client_ip} count={invalid_payload_count}")
                        last_invalid_log_time = now
                    continue

                # Only persist and score valid transitions (normalize action to string)
                tr["a"] = str(tr["a"]) if isinstance(tr["a"], str) else "noop"
                f.write(json.dumps(tr) + "\n")
                f.flush()
                r = reward_from_transition(tr)
                count += 1
                global_state["total_transitions"] += 1
                total += r
                if verbose:
                    print("t={t} a={a} r={r:.2f} connection_transitions={conn_t} global_transitions={global_t}".format(
                        t=tr.get("t"), a=tr.get("a"), r=r, conn_t=count, global_t=global_state["total_transitions"]))
                # Check if we've hit the global limit
                if max_remaining > 0 and global_state["total_transitions"] >= global_state["max_transitions"]:
                    return count, None
            if len(buf) > max_line_size:
                print("client_buffer_limit_exceeded client_ip={} buffered_chars={} max_line_size={} closing_connection".format(
                    client_ip, len(buf), max_line_size))
                buf = ""
                break
    
    if verbose and count:
        avg = total / count
        print("client_done client_ip={} connection_transitions={} global_transitions={} avg_reward={:.3f}".format(
            client_ip, count, global_state["total_transitions"], avg))
    return count, None


def main():
    parser = argparse.ArgumentParser(description="Mindustry RL socket receiver.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1 for loopback; use 0.0.0.0 for public).")
    parser.add_argument("--port", type=int, default=4567, help="Bind port.")
    parser.add_argument("--out", default="rl_socket.log", help="Output log file.")
    parser.add_argument("--verbose", action="store_true", help="Print per-transition rewards.")
    parser.add_argument("--max-transitions", type=int, default=0, help="Stop server after this many transitions globally (0 = unlimited).")
    parser.add_argument("--timeout", type=float, default=0.0, help="Stop server after this many seconds of no connection (0 = unlimited).")
    parser.add_argument("--recv-timeout", type=float, default=30.0, help="Per-connection receive timeout in seconds (0 = unlimited).")
    parser.add_argument("--max-line-size", type=int, default=65536, help="Maximum decoded line/buffer size allowed per client connection.")
    parser.add_argument("--stop-on-event", default="", help="Stop server when a socket control event with this name is received.")
    parser.add_argument("--token", default="", help="Optional shared token for payload authentication (clients must include in payload metadata).")
    parser.add_argument("--allowlist", default="", help="Optional comma-separated list of allowed client IPs (e.g., '127.0.0.1,192.168.1.100'). If empty, all IPs allowed.")
    args = parser.parse_args()

    if args.recv_timeout < 0:
        parser.error("--recv-timeout must be >= 0")
    if args.max_line_size <= 0:
        parser.error("--max-line-size must be > 0")

    # Parse allowlist
    allowlist = None
    if args.allowlist:
        allowlist = [ip.strip() for ip in args.allowlist.split(",") if ip.strip()]

    # Global state tracking process-level transition counter
    global_state = {
        "total_transitions": 0,
        "max_transitions": args.max_transitions,
        "max_remaining": args.max_transitions if args.max_transitions > 0 else 0
    }

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((args.host, args.port))
        s.listen(1)
        if args.timeout and args.timeout > 0:
            s.settimeout(args.timeout)
        print("listening_on={}:{}".format(args.host, args.port))
        print("max_transitions={}".format(args.max_transitions if args.max_transitions > 0 else "unlimited"))
        print("recv_timeout={}".format(args.recv_timeout if args.recv_timeout > 0 else "unlimited"))
        print("max_line_size={}".format(args.max_line_size))
        if args.token:
            print("authentication=token_required")
        if allowlist:
            print("allowlist={}".format(",".join(allowlist)))
        stop = False
        while not stop:
            try:
                conn, addr = s.accept()
            except socket.timeout:
                print("timeout_reached global_transitions={} stopping_server".format(global_state["total_transitions"]))
                break
            try:
                count, stop_event = handle_connection(
                    conn,
                    addr,
                    args.out,
                    args.verbose,
                    global_state,
                    required_token=args.token,
                    allowlist=allowlist,
                    stop_on_event=args.stop_on_event,
                    recv_timeout=args.recv_timeout,
                    max_line_size=args.max_line_size,
                )
                if stop_event:
                    print("stop_event_received={} global_transitions={} stopping_server".format(
                        stop_event, global_state["total_transitions"]))
                    break
                if args.max_transitions > 0 and global_state["total_transitions"] >= args.max_transitions:
                    print("max_transitions_reached_globally global_transitions={} stopping_server".format(
                        global_state["total_transitions"]))
                    break
            except Exception as exc:
                print("client_error={}".format(exc))
                time.sleep(0.2)
    
    print("final_global_transitions={}".format(global_state["total_transitions"]))


if __name__ == "__main__":
    main()
