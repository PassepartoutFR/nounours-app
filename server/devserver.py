#!/usr/bin/env python3
# Serveur de DEV local pour nounours.app : sert le site statique (site/) ET
# proxifie /api/* vers le scoreboard (comme le fait Caddy en prod). Pratique pour
# voir le « Tableau des gentils » en vrai sans deployer.
#   python server/devserver.py [port=8799] [scoreboard_port=8790]
# Lance le scoreboard automatiquement s'il n'ecoute pas deja.
import http.server, http.client, os, socket, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(os.path.dirname(HERE), "site")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
SB_PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8790
UP = ("127.0.0.1", SB_PORT)


def _up(port):
    s = socket.socket(); s.settimeout(0.3)
    try:
        s.connect(("127.0.0.1", port)); return True
    except Exception:
        return False
    finally:
        s.close()


def ensure_scoreboard():
    if _up(SB_PORT):
        return None
    p = subprocess.Popen([sys.executable, os.path.join(HERE, "server.py"), str(SB_PORT)])
    for _ in range(40):
        if _up(SB_PORT):
            break
        time.sleep(0.1)
    return p


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def _proxy(self, method):
        up_path = self.path[len("/api"):] or "/"
        body = b""
        if "Content-Length" in self.headers:
            body = self.rfile.read(int(self.headers["Content-Length"]))
        try:
            c = http.client.HTTPConnection(*UP, timeout=5)
            hdr = {k: v for k, v in self.headers.items()
                   if k.lower() in ("content-type", "x-forwarded-for")}
            c.request(method, up_path, body=body, headers=hdr)
            r = c.getresponse(); data = r.read()
            self.send_response(r.status)
            self.send_header("Content-Type", r.getheader("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers(); self.wfile.write(data)
        except Exception as e:
            self.send_error(502, str(e))

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._proxy("GET")
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._proxy("POST")
        self.send_error(404)


if __name__ == "__main__":
    ensure_scoreboard()
    print("dev nounours.app -> http://127.0.0.1:%d  (api -> :%d)" % (PORT, SB_PORT))
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
