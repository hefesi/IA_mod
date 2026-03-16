import argparse
import json
import socket
import time


def num(d, key):
    try:
        return float(d.get(key, 0))
    except Exception:
        return 0.0


def reward(s, s2):
    r = 0.0
    r += 0.005 * (num(s2, "copper") - num(s, "copper"))
    r += 0.007 * (num(s2, "lead") - num(s, "lead"))
    r += 2.0 * (num(s2, "drills") - num(s, "drills"))
    r += 4.0 * (num(s2, "turrets") - num(s, "turrets"))
    r += 1.5 * (num(s2, "power") - num(s, "power"))
    r += 6.0 * max(0.0, num(s, "enemies") - num(s2, "enemies"))
    r -= 1.5 * max(0.0, num(s, "unitsTotal") - num(s2, "unitsTotal"))
    r += 50.0 * (num(s2, "coreHealthFrac") - num(s, "coreHealthFrac"))
    if num(s, "enemyCore") == 1 and num(s2, "enemyCore") == 0:
        r += 200.0
    if num(s, "corePresent") == 1 and num(s2, "corePresent") == 0:
        r -= 250.0
    return r


def handle_connection(conn, addr, out_path, verbose):
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
                r = reward(tr.get("s", {}), tr.get("s2", {}))
                count += 1
                total += r
                if verbose:
                    print("t={t} a={a} r={r:.2f}".format(t=tr.get("t"), a=tr.get("a"), r=r))
    if verbose and count:
        avg = total / count
        print("client_done transitions={} avg_reward={:.3f}".format(count, avg))


def main():
    parser = argparse.ArgumentParser(description="Mindustry RL socket receiver.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host.")
    parser.add_argument("--port", type=int, default=4567, help="Bind port.")
    parser.add_argument("--out", default="rl_socket.log", help="Output log file.")
    parser.add_argument("--verbose", action="store_true", help="Print per-transition rewards.")
    args = parser.parse_args()

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((args.host, args.port))
        s.listen(1)
        print("listening_on={}:{}".format(args.host, args.port))
        while True:
            conn, addr = s.accept()
            try:
                handle_connection(conn, addr, args.out, args.verbose)
            except Exception as exc:
                print("client_error={}".format(exc))
                time.sleep(0.2)


if __name__ == "__main__":
    main()
