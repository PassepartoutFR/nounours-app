#!/usr/bin/env python3
# WebDeGentil — serveur de classement (port Python du server.js, sans dependance)
# Endpoints : GET /health · GET /leaderboard?limit=&uid= · POST /score
# "Connexion sans compte" : chaque addon a un uid + un token (HMAC cote client).
# Le serveur fait du TOFU : le 1er /score fixe le token de l'uid ; ensuite il faut
# le meme token pour mettre a jour. Anti-triche LEGER : score monotone + plafonds.
# Bind 127.0.0.1 (derriere Caddy /api/*). Stockage : scores.json a cote.
import hashlib, hmac, json, os, sys, time, threading
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PORT = next((int(a) for a in sys.argv[1:] if a.isdigit()), 8790)
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

# ---- Tableau des gentils : presence live (RAM only) + stats agregees --------
# Respect vie privee : AUCUN identifiant persiste, AUCUNE IP stockee. La presence
# vit en memoire (fenetre glissante) ; seuls des compteurs de visites AGREGES sont
# sur disque. sid = identifiant de SESSION ephemere, fourni par le navigateur.
STATS = os.path.join(HERE, "stats.json")
LIVE_WINDOW = 75.0        # s : un battement compte comme "present" pendant 75 s
LIVE_CAP_PER_IP = 5       # anti-gonflage : presences max comptees pour une IP
COUNTED_MAX = 200_000     # borne le set de dedup des visites (anti-fuite memoire)

stats_lock = threading.Lock()
try:
    with open(STATS, "r", encoding="utf-8") as f:
        stats = json.load(f)
    if not isinstance(stats, dict):
        stats = {}
except Exception:
    stats = {}
stats.setdefault("total", 0)
stats.setdefault("days", {})
# Faux positifs signales : compteurs AGREGES par langue (vie privee : aucun texte,
# aucune URL, jamais d'identifiant — juste {"fr": n, ...}). Persiste avec stats.
stats.setdefault("reports", {})

_live = {}        # sid -> (last_seen_monotonic, ip)  (jamais persiste)
_counted = set()  # sids deja comptes comme "visite" (dedup par session)

def save_stats():
    tmp = STATS + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(stats, f)
    os.replace(tmp, STATS)

def _day(now_wall):
    return time.strftime("%Y-%m-%d", time.gmtime(now_wall))  # jour UTC

def prune_live(now_mono):
    for s in [s for s, (ts, _ip) in _live.items() if now_mono - ts > LIVE_WINDOW]:
        del _live[s]

def compute_live(now_mono):
    prune_live(now_mono)
    per_ip = {}
    for _s, (_ts, ip) in _live.items():
        per_ip[ip] = per_ip.get(ip, 0) + 1
    return sum(min(c, LIVE_CAP_PER_IP) for c in per_ip.values())

def record_beat(sid, ip, now_mono, now_wall, persist=True):
    sid = str(sid)[:64]
    ip = str(ip)[:64]
    if not sid:
        return compute_live(now_mono)
    prune_live(now_mono)
    new_visit = sid not in _live and sid not in _counted
    _live[sid] = (now_mono, ip)
    if new_visit:
        if len(_counted) >= COUNTED_MAX:
            _counted.clear()
        _counted.add(sid)
        stats["total"] = int(stats.get("total", 0)) + 1
        d = _day(now_wall)
        stats["days"][d] = int(stats["days"].get(d, 0)) + 1
        if persist:
            try:
                save_stats()
            except Exception as e:
                sys.stderr.write("save_stats failed: %s\n" % e)
    return compute_live(now_mono)

def compute_stats(now_mono, now_wall):
    live = compute_live(now_mono)
    days = sorted(stats.get("days", {}).items())[-14:]
    with lock:
        accounts = len(scores)
        transformed = sum(clamp_int(v.get("total", 0)) for v in scores.values())
    return {
        "live": live,
        "today": int(stats.get("days", {}).get(_day(now_wall), 0)),
        "total": int(stats.get("total", 0)),
        "days": [{"d": k, "n": v} for k, v in days],
        "accounts": accounts,
        "transformed": transformed,
    }

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

def clean_lang(l):
    # Code de langue normalise : 2 lettres a-z minuscules (ex. "fr"). Tout le reste
    # (texte, casse, chiffres) -> "xx". Garantit que le compteur de faux positifs ne
    # stocke QUE des codes de langue, jamais de texte.
    s = "" if l is None else str(l).lower()
    out = ""
    for ch in s:
        if "a" <= ch <= "z":
            out += ch
        if len(out) >= 2:
            break
    return out if len(out) == 2 else "xx"


def record_report(lang):
    # Feature #4 — incremente le compteur AGREGE de faux positifs pour une langue.
    # Ne stocke qu'un nombre par code de langue (zero texte, zero URL). Renvoie le total.
    k = clean_lang(lang)
    stats["reports"][k] = int(stats["reports"].get(k, 0)) + 1
    return stats["reports"][k]


# Feature #6 — carte de chaleur de la gentillesse : compteur AGREGE par langue derive
# de l'en-tete Accept-Language. VIE PRIVEE : un nombre par code de langue (2 lettres),
# JAMAIS l'IP, jamais par utilisateur, zero texte.
stats.setdefault("geo", {})


def primary_lang(accept_language):
    # 1er sous-tag primaire (2 lettres a-z) d'un Accept-Language, sinon "??".
    # Ex. "fr-CA,fr;q=0.9,en;q=0.8" -> "fr". Tout le reste -> "??" (zero texte).
    first = ("" if accept_language is None else str(accept_language)).split(",")[0]
    tag = first.split(";")[0].split("-")[0].strip().lower()
    out = ""
    for ch in tag:
        if "a" <= ch <= "z":
            out += ch
        else:
            break
        if len(out) >= 2:
            break
    return out if len(out) == 2 else "??"


def record_geo(accept_language):
    k = primary_lang(accept_language)
    stats["geo"][k] = int(stats["geo"].get(k, 0)) + 1
    return k


def geo(limit):
    # Vue publique : {"regions": [{"c": code, "n": nombre}, ...]} tri decroissant, top ~20.
    arr = sorted(
        ({"c": c, "n": int(stats["geo"].get(c, 0))} for c in stats["geo"] if int(stats["geo"].get(c, 0)) > 0),
        key=lambda e: (-e["n"], e["c"]),
    )
    n = limit if isinstance(limit, int) and limit > 0 else 20
    return {"regions": arr[:n]}


# ---- Feature #2 : overrides (listes de detection editables a distance) -------
# Objet persiste : {"lex": {"fr": [...], ...}, "replies": {"nounours": {"fr": [...]}, ...}}.
# DATA ONLY : uniquement des tableaux de chaines. Jamais execute cote serveur ; le
# client (uwg-core.applyOverrides) les fusionne en pures donnees. Bornes dures.
OV_FILE = os.path.join(HERE, "overrides.json")
OV_MAX_ARRAY = 500   # entrees max par tableau
OV_MAX_LEN = 200     # caracteres max par entree
ov_lock = threading.Lock()
try:
    with open(OV_FILE, "r", encoding="utf-8") as f:
        overrides = json.load(f)
    if not isinstance(overrides, dict):
        overrides = {}
except Exception:
    overrides = {}


def save_overrides():
    tmp = OV_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(overrides, f)
    os.replace(tmp, OV_FILE)


def _sanitize_lang_map(m):
    # Valide+nettoie un dictionnaire {code: [chaines]}. Retourne None si une valeur
    # n'est PAS un tableau de chaines (=> 400). Sinon une copie nettoyee.
    if m is None:
        return {}
    if not isinstance(m, dict):
        return None
    out = {}
    for key in m:
        arr = m[key]
        if not isinstance(arr, list):
            return None
        if len(arr) > OV_MAX_ARRAY:
            return None
        clean = []
        for v in arr:
            if not isinstance(v, str):
                return None
            if len(v) > OV_MAX_LEN:
                return None
            clean.append(v)
        out[str(key)[:32]] = clean
    return out


def sanitize_overrides(obj):
    # Valide {lex?, replies?}. Renvoie (True, value) ou (False, None) (=> 400).
    # Tout ce qui n'est pas "tableaux de chaines" est rejete.
    if not isinstance(obj, dict):
        return (False, None)
    value = {}
    if "lex" in obj:
        lex = _sanitize_lang_map(obj["lex"])
        if lex is None:
            return (False, None)
        value["lex"] = lex
    if "replies" in obj:
        reps = obj["replies"]
        if reps is None:
            value["replies"] = {}
        elif not isinstance(reps, dict):
            return (False, None)
        else:
            out_reps = {}
            for theme in reps:
                by_lang = _sanitize_lang_map(reps[theme])
                if by_lang is None:
                    return (False, None)
                out_reps[str(theme)[:32]] = by_lang
            value["replies"] = out_reps
    return (True, value)


def clean_team(t):
    # Code d'equipe : caracteres imprimables, <= 24. Vide -> "" (quitter / sans equipe).
    s = "" if t is None else str(t)
    out = "".join(ch for ch in s if ord(ch) >= 32 and ord(ch) != 127)
    return out.strip()[:24]


def teams(limit):
    # Feature #10 — classement agrege des equipes : somme des totaux des membres par
    # equipe, tri decroissant. [{rank, team, total, members}].
    agg = {}
    for v in scores.values():
        t = v.get("team") if isinstance(v, dict) else ""
        if not isinstance(t, str) or not t:
            continue
        a = agg.setdefault(t, {"total": 0, "members": 0})
        a["total"] += clamp_int(v.get("total", 0))
        a["members"] += 1
    arr = sorted(
        ({"team": k, "total": a["total"], "members": a["members"]} for k, a in agg.items()),
        key=lambda e: (-e["total"], e["team"]),
    )
    n = limit if isinstance(limit, int) and limit > 0 else len(arr)
    return [{"rank": i + 1, "team": e["team"], "total": e["total"], "members": e["members"]}
            for i, e in enumerate(arr[:n])]


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

# ---- Admin (mainteneur) : sante + stats + moderation du classement ----------
# La cle d'admin est lue UNIQUEMENT depuis l'environnement (NOUNOURS_ADMIN_KEY) ;
# JAMAIS en dur dans le code (ce depot est PUBLIC). Si la variable est vide/absente,
# l'admin est DESACTIVE et toutes les routes /admin/* repondent 403.
# La page admin envoie la cle dans l'en-tete HTTP X-Admin-Key.
def check_admin_key(provided, env_key):
    # Faux si la cle serveur est absente/vide (admin desactive) ou si elle ne
    # correspond pas. Comparaison a temps constant (hmac.compare_digest).
    if not env_key or not isinstance(env_key, str):
        return False
    if not isinstance(provided, str) or provided == "":
        return False
    import hmac
    return hmac.compare_digest(provided, env_key)

def admin_scores():
    # Classement COMPLET pour l'admin : [{uid, pseudo, total}] tri decroissant.
    with lock:
        arr = [{"uid": k, "pseudo": v["pseudo"], "total": v["total"]} for k, v in scores.items()]
    arr.sort(key=lambda e: (-e["total"], e["pseudo"]))
    return arr

# ---- Suppression autonome (sans e-mail) -------------------------------------
# Deux preuves acceptees pour POST /account/delete :
#   1) {uid, token} — depuis l'extension (prouve la possession du secret derive).
#   2) {uid, exp, sig} — code DEL1 temporaire (15 min) : sig = HMAC(token, "del:uid:exp").
# Le code DEL1 n'expose jamais le secret ni le token complet sur la page web.
DEL_TTL = 900  # secondes

def del_sig(token_hex, uid, exp):
    msg = ("del:%s:%d" % (uid, int(exp))).encode("utf-8")
    try:
        key = bytes.fromhex(str(token_hex))
    except Exception:
        return ""
    return hmac.new(key, msg, hashlib.sha256).hexdigest()

def verify_delete_auth(d, stored_token):
    uid = str(d.get("uid", ""))[:64]
    if not uid:
        return False, "uid requis"
    token = str(d.get("token", ""))[:128]
    if token:
        if not hmac.compare_digest(stored_token, token):
            return False, "token invalide"
        return True, uid
    exp = d.get("exp")
    sig = str(d.get("sig", ""))[:128]
    if not sig or exp is None:
        return False, "preuve requise"
    try:
        exp_i = int(exp)
    except Exception:
        return False, "code expire ou invalide"
    if exp_i < time.time():
        return False, "code expire ou invalide"
    expected = del_sig(stored_token, uid, exp_i)
    if not expected or not hmac.compare_digest(expected, sig):
        return False, "code invalide"
    return True, uid

def delete_account(d):
    uid = str(d.get("uid", ""))[:64]
    if not uid:
        return 400, {"error": "uid requis"}
    with lock:
        cur = scores.get(uid)
        if cur is None:
            return 200, {"ok": True, "removed": False}
        ok, err_or_uid = verify_delete_auth(d, cur["token"])
        if not ok:
            code = 403 if "invalide" in err_or_uid else 400
            return code, {"error": err_or_uid}
        del scores[uid]
        try:
            save()
        except Exception as e:
            sys.stderr.write("save failed: %s\n" % e)
    return 200, {"ok": True, "removed": True}

class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key")

    def _admin_gate(self):
        # Renvoie True si la requete admin est autorisee. Sinon ecrit la reponse
        # d'erreur (403 admin desactive / 403 interdit) et renvoie False.
        env_key = os.environ.get("NOUNOURS_ADMIN_KEY", "")
        if not env_key:
            self._json(403, {"error": "admin disabled"})
            return False
        provided = self.headers.get("X-Admin-Key", "")
        if not check_admin_key(provided, env_key):
            self._json(403, {"error": "forbidden"})
            return False
        return True

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
        if u.path == "/stats":
            now_mono, now_wall = time.monotonic(), time.time()
            with stats_lock:
                out = compute_stats(now_mono, now_wall)
            return self._json(200, out)
        if u.path == "/teams":
            q = parse_qs(u.query)
            try:
                limit = max(1, min(100, int(q.get("limit", ["20"])[0])))
            except Exception:
                limit = 20
            with lock:
                out = teams(limit)
            return self._json(200, {"teams": out})
        if u.path == "/geo":
            # Feature #6 — carte de chaleur (PUBLIC) : {"regions": [{"c","n"}, ...]}.
            with stats_lock:
                out = geo(20)
            return self._json(200, out)
        if u.path == "/lists":
            # Feature #2 — overrides (PUBLIC, lecture seule, cacheable). DATA ONLY.
            with ov_lock:
                out = dict(overrides) if isinstance(overrides, dict) else {}
            body = json.dumps(out).encode("utf-8")
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "public, max-age=300")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path == "/admin/overview":
            if not self._admin_gate():
                return
            now_mono, now_wall = time.monotonic(), time.time()
            with stats_lock:
                s = compute_stats(now_mono, now_wall)
            with stats_lock:
                reports = dict(stats.get("reports", {}))
            return self._json(200, {
                "accounts": s["accounts"],
                "transformed": s["transformed"],
                "live": s["live"],
                "today": s["today"],
                "total": s["total"],
                "reports": reports,
                "serverTime": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now_wall)),
            })
        if u.path == "/admin/scores":
            if not self._admin_gate():
                return
            return self._json(200, admin_scores())
        return self._json(404, {"error": "not found"})

    def _beat(self):
        if not rate_ok(self._client_ip()):
            return self._json(429, {"error": "trop de requetes"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except Exception:
            length = 0
        if length < 0 or length > 1024:
            return self._json(400, {"error": "corps invalide"})
        raw = self.rfile.read(length) if length else b""
        try:
            d = json.loads(raw.decode("utf-8")) if raw else {}
        except Exception:
            d = {}
        sid = str(d.get("sid", ""))[:64]
        now_mono, now_wall = time.monotonic(), time.time()
        with stats_lock:
            live = record_beat(sid, self._client_ip(), now_mono, now_wall)
            # Feature #6 — carte de chaleur : compteur agrege par langue (Accept-Language).
            # VIE PRIVEE : un nombre par code de langue, jamais l'IP, jamais par utilisateur.
            record_geo(self.headers.get("Accept-Language"))
            try:
                save_stats()
            except Exception as e:
                sys.stderr.write("save_stats failed: %s\n" % e)
        return self._json(200, {"ok": True, "live": live})

    def do_POST(self):
        u = urlparse(self.path)
        if u.path == "/beat":
            return self._beat()
        if u.path == "/report":
            # Feature #4 — signalement de faux positif (PUBLIC, corps minuscule).
            # Le corps ne transporte QUE {lang}. Borne 256 o + rate-limit ; on
            # n'incremente qu'un compteur agrege par langue (zero texte stocke).
            if not rate_ok(self._client_ip()):
                return self._json(429, {"error": "trop de requetes"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except Exception:
                length = 0
            if length < 0 or length > 256:
                return self._json(400, {"error": "corps invalide"})
            raw = self.rfile.read(length) if length else b""
            try:
                d = json.loads(raw.decode("utf-8")) if raw else {}
            except Exception:
                d = {}
            with stats_lock:
                n = record_report(d.get("lang"))
                try:
                    save_stats()
                except Exception as e:
                    sys.stderr.write("save_stats failed: %s\n" % e)
            return self._json(200, {"ok": True, "count": n})
        if u.path == "/team/join":
            # Feature #10 — rejoindre une equipe (token verifie comme /score).
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
            with lock:
                cur = scores.get(uid)
                if cur is None:
                    return self._json(404, {"error": "inconnu"})
                if cur["token"] != token:
                    return self._json(403, {"error": "token invalide"})
                team = clean_team(d.get("team"))
                if team:
                    cur["team"] = team
                elif "team" in cur:
                    del cur["team"]
                try:
                    save()
                except Exception as e:
                    sys.stderr.write("save failed: %s\n" % e)
            return self._json(200, {"ok": True, "team": team})
        if u.path == "/account/delete":
            # Suppression autonome : token direct ou code DEL1 temporaire (15 min).
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
            code, body = delete_account(d)
            return self._json(code, body)
        if u.path == "/admin/delete":
            if not self._admin_gate():
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except Exception:
                length = 0
            if length < 0 or length > 4096:
                return self._json(400, {"error": "corps invalide"})
            raw = self.rfile.read(length) if length else b""
            try:
                d = json.loads(raw.decode("utf-8")) if raw else {}
            except Exception:
                return self._json(400, {"error": "bad json"})
            uid = str(d.get("uid", ""))[:64]
            if not uid:
                return self._json(400, {"error": "uid requis"})
            with lock:
                removed = uid in scores
                if removed:
                    del scores[uid]
                    try:
                        save()
                    except Exception as e:
                        sys.stderr.write("save failed: %s\n" % e)
            return self._json(200, {"ok": True, "removed": removed})
        if u.path == "/admin/lists":
            # Feature #2 — remplace les overrides (DATA ONLY). Gardee par X-Admin-Key.
            # Corps borne a ~512 Ko ; VALIDE strictement (tableaux de chaines) sinon 400.
            if not self._admin_gate():
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except Exception:
                length = 0
            if length < 0 or length > 524288:
                return self._json(400, {"error": "corps invalide"})
            raw = self.rfile.read(length) if length else b""
            try:
                d = json.loads(raw.decode("utf-8")) if raw else {}
            except Exception:
                return self._json(400, {"error": "bad json"})
            okv, value = sanitize_overrides(d)
            if not okv:
                return self._json(400, {"error": "overrides invalides (tableaux de chaines uniquement)"})
            global overrides
            with ov_lock:
                overrides = value
                try:
                    save_overrides()
                except Exception as e:
                    sys.stderr.write("save_overrides failed: %s\n" % e)
            return self._json(200, {"ok": True})
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

def _selftest():
    # Verifie la logique presence/stats SANS ouvrir de socket ni ecrire de fichier.
    global stats
    fails = [0]
    def ok(cond, msg):
        print(("ok   " if cond else "FAIL ") + msg)
        if not cond:
            fails[0] += 1
    stats = {"total": 0, "days": {}, "reports": {}, "geo": {}}
    _live.clear(); _counted.clear(); scores.clear()
    t0, w0 = 1000.0, 1_700_000_000.0  # mono + wall (UTC) fixes

    record_beat("a", "1.1.1.1", t0, w0, persist=False)
    ok(compute_stats(t0, w0)["total"] == 1, "1re visite comptee")
    ok(compute_live(t0) == 1, "1 present")

    record_beat("a", "1.1.1.1", t0 + 1, w0, persist=False)
    ok(stats["total"] == 1, "meme session = pas de double visite")

    record_beat("b", "1.1.1.1", t0 + 1, w0, persist=False)
    ok(compute_live(t0 + 1) == 2, "2 sessions meme IP = 2 presents")

    for i in range(20):
        record_beat("flood%d" % i, "9.9.9.9", t0 + 2, w0, persist=False)
    ok(compute_live(t0 + 2) == 2 + LIVE_CAP_PER_IP, "plafond par IP applique (anti-gonflage)")

    ok(compute_live(t0 + 2 + LIVE_WINDOW + 1) == 0, "fenetre expiree -> 0 present")

    record_beat("c", "2.2.2.2", t0 + 999, w0 + 86400, persist=False)
    s = compute_stats(t0 + 999, w0 + 86400)
    ok(s["today"] == 1 and len(s["days"]) == 2, "bucket par jour (UTC)")

    scores["u1"] = {"token": "t", "pseudo": "X", "total": 30}
    scores["u2"] = {"token": "t", "pseudo": "Y", "total": 12}
    s2 = compute_stats(t0 + 1000, w0 + 86400)
    ok(s2["accounts"] == 2, "comptes = 2")
    ok(s2["transformed"] == 42, "mechancetes adoucies = somme des scores")

    sid_long = "x" * 200
    record_beat(sid_long, "3.3.3.3", t0 + 1001, w0 + 86400, persist=False)
    ok(all(len(k) <= 64 for k in _live), "sid borne a 64 (anti-abus)")

    # ---- admin : verification de la cle ----
    ok(check_admin_key("s3cr3t", "s3cr3t") is True, "cle admin correcte -> True")
    ok(check_admin_key("mauvaise", "s3cr3t") is False, "cle admin erronee -> False")
    ok(check_admin_key("s3cr3t", "") is False, "cle serveur vide (admin desactive) -> False")
    ok(admin_scores()[0]["total"] >= admin_scores()[-1]["total"], "admin_scores tri decroissant")

    # ---- Feature #4 : compteur de faux positifs par langue ----
    record_report("fr"); record_report("fr"); record_report("en")
    ok(stats["reports"]["fr"] == 2 and stats["reports"]["en"] == 1, "faux positifs comptes par langue")
    ok(clean_lang("FR") == "fr" and clean_lang("garbage text") == "ga", "clean_lang : 2 lettres a-z")
    ok(clean_lang("4!") == "xx", "clean_lang : non-langue -> xx (zero texte)")

    # ---- Feature #10 : equipes (jointure + agregation) ----
    scores.clear()
    scores["a"] = {"token": "t", "pseudo": "A", "total": 30}
    scores["b"] = {"token": "t", "pseudo": "B", "total": 12}
    scores["c"] = {"token": "t", "pseudo": "C", "total": 50}
    scores["a"]["team"] = clean_team("Les Nounours")
    scores["b"]["team"] = clean_team("Les Nounours")
    scores["c"]["team"] = clean_team("Solo")
    tt = teams(10)
    nounours = next(e for e in tt if e["team"] == "Les Nounours")
    ok(nounours["total"] == 42, "equipe : somme des membres")
    ok(nounours["members"] == 2, "equipe : nb de membres")
    ok(tt[0]["team"] == "Solo" and tt[0]["total"] >= tt[1]["total"], "equipes triees decroissant")
    ok(clean_team("x" * 40) == "x" * 24, "clean_team borne a 24")

    # ---- Feature #6 : carte de chaleur (compteur agrege par langue) ----
    stats["geo"] = {}
    ok(primary_lang("fr-CA,fr;q=0.9,en;q=0.8") == "fr", "primary_lang : 1er sous-tag (fr-CA -> fr)")
    ok(primary_lang("EN-US") == "en", "primary_lang : casse normalisee")
    ok(primary_lang("") == "??" and primary_lang(None) == "??", "primary_lang : vide -> ??")
    ok(primary_lang("12-x") == "??", "primary_lang : non-lettres -> ?? (zero texte)")
    record_geo("fr-FR"); record_geo("fr"); record_geo("en-GB"); record_geo("zzz-zz")
    ok(stats["geo"]["fr"] == 2 and stats["geo"]["en"] == 1, "geo : compte agrege par langue")
    g = geo(20)
    ok(g["regions"][0]["c"] == "fr" and g["regions"][0]["n"] == 2, "geo : trie decroissant, forme {c,n}")
    ok(all(set(r.keys()) == {"c", "n"} for r in g["regions"]), "geo : uniquement {c,n} (zero IP, zero identifiant)")

    # ---- Feature #2 : overrides (validation : tableaux de chaines uniquement) ----
    okv, val = sanitize_overrides({"lex": {"fr": ["nouveau-mechant"]}, "replies": {"nounours": {"fr": ["bisou"]}}})
    ok(okv and val["lex"]["fr"] == ["nouveau-mechant"], "overrides : payload valide accepte")
    ok(sanitize_overrides({"lex": {"fr": [123]}})[0] is False, "overrides : non-chaine rejete (400)")
    ok(sanitize_overrides({"lex": {"fr": "pas-un-tableau"}})[0] is False, "overrides : non-tableau rejete (400)")
    ok(sanitize_overrides({"lex": {"fr": ["x" * 999]}})[0] is False, "overrides : entree trop longue rejetee (400)")
    ok(sanitize_overrides({"lex": {"fr": ["ok"] * 999}})[0] is False, "overrides : tableau trop grand rejete (400)")
    ok(sanitize_overrides([])[0] is False, "overrides : racine non-objet rejetee (400)")
    ok(sanitize_overrides({})[0] is True, "overrides : objet vide accepte")

    # ---- suppression autonome (token ou code DEL1) ----
    scores.clear()
    tok = "ab" * 16
    scores["delu"] = {"token": tok, "pseudo": "Z", "total": 9}
    ok(delete_account({"uid": "delu", "token": tok})[1].get("removed") is True, "delete : token valide supprime")
    ok("delu" not in scores, "delete : entree retiree de scores")
    ok(delete_account({"uid": "delu", "token": tok})[1].get("removed") is False, "delete : deja supprime -> removed false")
    scores["delu"] = {"token": tok, "pseudo": "Z", "total": 9}
    exp_ok = int(time.time()) + 120
    sig_ok = del_sig(tok, "delu", exp_ok)
    ok(delete_account({"uid": "delu", "exp": exp_ok, "sig": sig_ok})[1].get("removed") is True, "delete : code DEL1 valide")
    scores["delu"] = {"token": tok, "pseudo": "Z", "total": 9}
    ok(delete_account({"uid": "delu", "exp": exp_ok, "sig": "00" * 32})[0] == 403, "delete : mauvaise sig -> 403")
    ok(delete_account({"uid": "delu", "exp": int(time.time()) - 10, "sig": sig_ok})[0] == 403, "delete : code expire -> 403")

    total = 45
    print("\n%d/%d selftest verts" % (total - fails[0], total))
    return fails[0]

if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(1 if _selftest() else 0)
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    print("WebDeGentil scoreboard (python) -> http://127.0.0.1:%d" % PORT)
    srv.serve_forever()
