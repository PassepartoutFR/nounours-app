#!/usr/bin/env python3
# WebDeGentil — serveur de classement (port Python du server.js, sans dependance)
# Endpoints : GET /health · GET /leaderboard?limit=&uid= · POST /score
# "Connexion sans compte" : chaque addon a un uid + un token (HMAC cote client).
# Le serveur fait du TOFU : le 1er /score fixe le token de l'uid ; ensuite il faut
# le meme token pour mettre a jour. Anti-triche LEGER : score monotone + plafonds.
# Bind 127.0.0.1 (derriere Caddy /api/*). Stockage : scores.json a cote.
import json, os, sys, time, threading
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "scores.json")

MAX_TOTAL = 10_000_000
FIRST_CAP = 100_000
DELTA_CAP = 5_000

lock = threading.Lock()
try:
    with open(DATA, "r", encoding="utf-8") as f:
        scores = json.load(f)
except Exception:
    scores = {}

# rate limit best-effort : N requetes / fenetre par IP
RL_MAX, RL_WINDOW = 60, 60.0
_rl = {}

def rate_ok(ip):
    now = time.monotonic()
    dq = _rl.setdefault(ip, deque())
    while dq and now - dq[0] > RL_WINDOW:
        dq.popleft()
    if len(dq) >= RL_MAX:
        return False
    dq.append(now)
    return True

def save():
    tmp = DATA + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(scores, f)
    os.replace(tmp, DATA)

def clean_pseudo(p):
    s = "" if p is None else str(p)
    out = "".join(ch for ch in s if ord(ch) >= 32 and ord(ch) != 127)
    out = out.strip()[:24]
    return out or "Anonyme"

def clamp_int(n):
    try:
        n = int(n)
    except Exception:
        n = 0
    if n < 0:
        n = 0
    if n > MAX_TOTAL:
        n = MAX_TOTAL
    return n

def leaderboard(limit, uid):
    arr = sorted(
        ({"id": k, "pseudo": v["pseudo"], "total": v["total"]} for k, v in scores.items()),
        key=lambda e: (-e["total"], e["pseudo"]),
    )
    top = [{"rank": i + 1, "pseudo": e["pseudo"], "total": e["total"]} for i, e in enumerate(arr[:limit])]
    you = None
    if uid and uid in scores:
        idx = next((i for i, e in enumerate(arr) if e["id"] == uid), -1)
        you = {"rank": idx + 1, "pseudo": scores[uid]["pseudo"], "total": scores[uid]["total"]}
    return {"top": top, "you": you, "count": len(arr)}

class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _client_ip(self):
        xff = self.headers.get("X-Forwarded-For")
        if xff:
            return xff.split(",")[0].strip()
        return self.client_address[0]

    def log_message(self, *a):
        pass  # silencieux

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/health":
            return self._json(200, {"ok": True, "count": len(scores)})
        if u.path == "/leaderboard":
            q = parse_qs(u.query)
            try:
                limit = max(1, min(100, int(q.get("limit", ["20"])[0])))
            except Exception:
                limit = 20
            uid = q.get("uid", [""])[0]
            with lock:
                return self._json(200, leaderboard(limit, uid))
        return self._json(404, {"error": "not found"})

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/score":
            return self._json(404, {"error": "not found"})
        if not rate_ok(self._client_ip()):
            return self._json(429, {"error": "trop de requetes"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except Exception:
            length = 0
        if length <= 0 or length > 4096:
            return self._json(400, {"error": "corps invalide"})
        try:
            d = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return self._json(400, {"error": "bad json"})

        uid = str(d.get("uid", ""))[:64]
        token = str(d.get("token", ""))[:128]
        if not uid or not token:
            return self._json(400, {"error": "uid/token requis"})
        pseudo = clean_pseudo(d.get("pseudo"))
        incoming = clamp_int(d.get("total"))

        with lock:
            cur = scores.get(uid)
            if cur is None:
                scores[uid] = {"token": token, "pseudo": pseudo, "total": min(incoming, FIRST_CAP)}
            else:
                if cur["token"] != token:
                    return self._json(403, {"error": "token invalide"})
                capped = min(incoming, cur["total"] + DELTA_CAP)
                cur["total"] = max(cur["total"], clamp_int(capped))  # monotone
                cur["pseudo"] = pseudo
            try:
                save()
            except Exception as e:
                sys.stderr.write("save failed: %s\n" % e)
            lb = leaderboard(1, uid)
        return self._json(200, {"ok": True, "rank": lb["you"]["rank"] if lb["you"] else None, "total": scores[uid]["total"]})

if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    print("WebDeGentil scoreboard (python) -> http://127.0.0.1:%d" % PORT)
    srv.serve_forever()
