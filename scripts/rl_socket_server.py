import argparse
import json
import socket
import time

from rl_common import reward_from_transition


def handle_connection(conn, addr, out_path, verbose, max_transitions=0):
    buf = ""
    count = 0
    total = 0.0
    with conn, open(out_path, "a", encoding="utf-8") as f:
        if verbose:
            print("client_connected={}".format(addr))
        while True:
            data = conn.recv(4096)
            if not data:
                break
            buf += data.decode("utf-8", errors="ignore")
            while "\n" in buf:
                line, buf = buf.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                f.write(line + "\n")
                f.flush()
                try:
                    tr = json.loads(line)
                except json.JSONDecodeError:
                    continue
                r = reward_from_transition(tr)
                count += 1
                total += r
                if verbose:
                    print("t={t} a={a} r={r:.2f}".format(t=tr.get("t"), a=tr.get("a"), r=r))
                if max_transitions and count >= max_transitions:
                    return count
    if verbose and count:
        avg = total / count
        print("client_done transitions={} avg_reward={:.3f}".format(count, avg))
    return count


def main():
    parser = argparse.ArgumentParser(description="Mindustry RL socket receiver.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host.")
    parser.add_argument("--port", type=int, default=4567, help="Bind port.")
    parser.add_argument("--out", default="rl_socket.log", help="Output log file.")
    parser.add_argument("--verbose", action="store_true", help="Print per-transition rewards.")
    parser.add_argument("--max-transitions", type=int, default=0, help="Stop server after this many transitions (0 = unlimited).")
    parser.add_argument("--timeout", type=float, default=0.0, help="Stop server after this many seconds of no connection (0 = unlimited).")
    args = parser.parse_args()

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((args.host, args.port))
        s.listen(1)
        if args.timeout and args.timeout > 0:
            s.settimeout(args.timeout)
        print("listening_on={}:{}".format(args.host, args.port))
        stop = False
        while not stop:
            try:
                conn, addr = s.accept()
            except socket.timeout:
                print("timeout_reached, stopping server")
                break
            try:
                count = handle_connection(conn, addr, args.out, args.verbose, max_transitions=args.max_transitions)
                if args.max_transitions and count >= args.max_transitions:
                    print("max_transitions reached ({}), stopping server".format(count))
                    break
            except Exception as exc:
                print("client_error={}".format(exc))
                time.sleep(0.2)


if __name__ == "__main__":
    main()
