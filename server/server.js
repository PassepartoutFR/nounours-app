// WebDeGentil — serveur de classement (sans dependance)
// Endpoints : GET /health · GET /leaderboard?limit=&uid= · POST /score
// Stockage : scores.json (a cote). "Connexion sans compte" : chaque addon a un
// uid + un token (= HMAC(secret, uid)). On fait du TOFU : le 1er /score fixe le
// token de l'uid ; ensuite il faut le meme token pour mettre a jour son score.
// Anti-triche LEGER (projet fun, systeme a l'honneur) : score monotone + plafonds.
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || process.argv[2] || 8790);
const DATA = path.join(__dirname, "scores.json");

let scores = {};
try { scores = JSON.parse(fs.readFileSync(DATA, "utf8")); } catch (_) { scores = {}; }

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(DATA, JSON.stringify(scores)); }
    catch (e) { console.error("save failed:", e.message); }
  }, 250);
}

const MAX_TOTAL = 10000000; // plafond absolu
const FIRST_CAP = 100000;   // plafond a la 1ere inscription
const DELTA_CAP = 5000;     // hausse maxi par mise a jour

// ---- Tableau des gentils : presence live (RAM only) + stats agregees --------
// Respect vie privee : AUCUN identifiant persiste, AUCUNE IP stockee. La presence
// vit en memoire (fenetre glissante) ; seuls des compteurs de visites AGREGES sont
// sur disque. sid = identifiant de SESSION ephemere fourni par le navigateur.
const STATS = path.join(__dirname, "stats.json");
const LIVE_WINDOW = 75000;     // ms : un battement compte comme "present" 75 s
const LIVE_CAP_PER_IP = 5;     // anti-gonflage : presences max comptees pour une IP
const COUNTED_MAX = 200000;    // borne le set de dedup des visites

let stats;
try { stats = JSON.parse(fs.readFileSync(STATS, "utf8")); if (!stats || typeof stats !== "object") stats = {}; }
catch (_) { stats = {}; }
if (typeof stats.total !== "number") stats.total = 0;
if (!stats.days || typeof stats.days !== "object") stats.days = {};

const live = new Map();   // sid -> { ts, ip }  (jamais persiste)
const counted = new Set(); // sids deja comptes comme "visite"

let statsTimer = null;
function saveStats() {
  clearTimeout(statsTimer);
  statsTimer = setTimeout(() => {
    try { fs.writeFileSync(STATS, JSON.stringify(stats)); }
    catch (e) { console.error("saveStats failed:", e.message); }
  }, 250);
}
function dayOf(wallMs) { return new Date(wallMs).toISOString().slice(0, 10); } // jour UTC
function pruneLive(nowMs) {
  for (const [sid, v] of live) if (nowMs - v.ts > LIVE_WINDOW) live.delete(sid);
}
function computeLive(nowMs) {
  pruneLive(nowMs);
  const perIp = new Map();
  for (const { ip } of live.values()) perIp.set(ip, (perIp.get(ip) || 0) + 1);
  let n = 0;
  for (const c of perIp.values()) n += Math.min(c, LIVE_CAP_PER_IP);
  return n;
}
function recordBeat(sid, ip, nowMs, wallMs, persist = true) {
  sid = String(sid || "").slice(0, 64);
  ip = String(ip || "").slice(0, 64);
  if (!sid) return computeLive(nowMs);
  pruneLive(nowMs);
  const newVisit = !live.has(sid) && !counted.has(sid);
  live.set(sid, { ts: nowMs, ip });
  if (newVisit) {
    if (counted.size >= COUNTED_MAX) counted.clear();
    counted.add(sid);
    stats.total = (Number(stats.total) || 0) + 1;
    const d = dayOf(wallMs);
    stats.days[d] = (Number(stats.days[d]) || 0) + 1;
    if (persist) saveStats();
  }
  return computeLive(nowMs);
}
function computeStats(nowMs, wallMs) {
  const liveNow = computeLive(nowMs);
  const days = Object.keys(stats.days).sort().slice(-14).map((k) => ({ d: k, n: stats.days[k] }));
  let transformed = 0;
  for (const v of Object.values(scores)) transformed += clampInt(v.total || 0);
  return {
    live: liveNow,
    today: Number(stats.days[dayOf(wallMs)]) || 0,
    total: Number(stats.total) || 0,
    days,
    accounts: Object.keys(scores).length,
    transformed,
  };
}
function _reset() { // utilitaire de test : remet l'etat a zero
  for (const k in scores) delete scores[k];
  stats.total = 0; stats.days = {}; live.clear(); counted.clear();
}

// retire les caracteres de controle sans regex (zero octet de controle dans la source)
function cleanPseudo(p) {
  let out = "";
  for (const ch of String(p == null ? "" : p)) {
    const c = ch.codePointAt(0);
    if (c >= 32 && c !== 127) out += ch;
  }
  return out.trim().slice(0, 24) || "Anonyme";
}
function clampInt(n) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n) || n < 0) n = 0;
  if (n > MAX_TOTAL) n = MAX_TOTAL;
  return n;
}

// ---- Admin (mainteneur) : sante + stats + moderation du classement ----------
// La cle d'admin est lue UNIQUEMENT depuis l'environnement (NOUNOURS_ADMIN_KEY) ;
// JAMAIS en dur dans le code (ce depot est PUBLIC). Si la variable est vide/absente,
// l'admin est DESACTIVE et toutes les routes /admin/* repondent 403.
// La page admin envoie la cle dans l'en-tete HTTP X-Admin-Key.
function checkAdminKey(provided, envKey) {
  // Faux si la cle serveur est absente/vide (admin desactive) ou si la cle fournie
  // ne correspond pas. Comparaison a temps quasi-constant (pas de court-circuit sur
  // la longueur quand c'est facile) pour limiter les fuites par timing.
  if (!envKey || typeof envKey !== "string") return false;
  if (typeof provided !== "string" || provided.length === 0) return false;
  if (provided.length !== envKey.length) return false;
  let diff = 0;
  for (let i = 0; i < envKey.length; i++) diff |= provided.charCodeAt(i) ^ envKey.charCodeAt(i);
  return diff === 0;
}

// Renvoie le classement COMPLET pour l'admin : [{uid, pseudo, total}] tri decroissant.
function adminScores() {
  return Object.entries(scores)
    .map(([uid, v]) => ({ uid, pseudo: v.pseudo, total: v.total }))
    .sort((a, b) => b.total - a.total || a.pseudo.localeCompare(b.pseudo));
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");
}
function sendJson(res, code, obj) {
  cors(res);
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function leaderboard(limit, uid) {
  const arr = Object.entries(scores)
    .map(([id, v]) => ({ id, pseudo: v.pseudo, total: v.total }))
    .sort((a, b) => b.total - a.total || a.pseudo.localeCompare(b.pseudo));
  const top = arr.slice(0, limit).map((e, i) => ({ rank: i + 1, pseudo: e.pseudo, total: e.total }));
  let you = null;
  if (uid && scores[uid]) {
    const idx = arr.findIndex((e) => e.id === uid);
    you = { rank: idx + 1, pseudo: scores[uid].pseudo, total: scores[uid].total };
  }
  return { top, you, count: arr.length };
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");

  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); return res.end(); }

  if (req.method === "GET" && u.pathname === "/health") {
    return sendJson(res, 200, { ok: true, count: Object.keys(scores).length });
  }

  if (req.method === "GET" && u.pathname === "/leaderboard") {
    const limit = Math.min(100, Math.max(1, parseInt(u.searchParams.get("limit") || "20", 10)));
    const uid = u.searchParams.get("uid") || "";
    return sendJson(res, 200, leaderboard(limit, uid));
  }

  if (req.method === "GET" && u.pathname === "/stats") {
    const now = Date.now();
    return sendJson(res, 200, computeStats(now, now));
  }

  // ---- Routes admin (gardees par X-Admin-Key vs NOUNOURS_ADMIN_KEY) ----------
  if (u.pathname === "/admin/overview" || u.pathname === "/admin/scores" || u.pathname === "/admin/delete") {
    const envKey = process.env.NOUNOURS_ADMIN_KEY || "";
    if (!envKey) return sendJson(res, 403, { error: "admin disabled" });
    const provided = req.headers["x-admin-key"];
    if (!checkAdminKey(typeof provided === "string" ? provided : "", envKey)) {
      return sendJson(res, 403, { error: "forbidden" });
    }

    if (req.method === "GET" && u.pathname === "/admin/overview") {
      const now = Date.now();
      const s = computeStats(now, now);
      return sendJson(res, 200, {
        accounts: s.accounts,
        transformed: s.transformed,
        live: s.live,
        today: s.today,
        total: s.total,
        serverTime: new Date(now).toISOString(),
      });
    }

    if (req.method === "GET" && u.pathname === "/admin/scores") {
      return sendJson(res, 200, adminScores());
    }

    if (req.method === "POST" && u.pathname === "/admin/delete") {
      let body = "";
      req.on("data", (c) => { body += c; if (body.length > 4096) req.destroy(); });
      req.on("end", () => {
        let d;
        try { d = JSON.parse(body || "{}"); } catch (_) { return sendJson(res, 400, { error: "bad json" }); }
        const uid = String(d && d.uid != null ? d.uid : "").slice(0, 64);
        if (!uid) return sendJson(res, 400, { error: "uid requis" });
        const removed = Object.prototype.hasOwnProperty.call(scores, uid);
        if (removed) { delete scores[uid]; save(); }
        return sendJson(res, 200, { ok: true, removed });
      });
      return;
    }

    return sendJson(res, 404, { error: "not found" });
  }

  if (req.method === "POST" && u.pathname === "/beat") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1024) req.destroy(); });
    req.on("end", () => {
      let d = {};
      try { d = JSON.parse(body || "{}"); } catch (_) { d = {}; }
      const sid = String(d.sid || "").slice(0, 64);
      const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "";
      const now = Date.now();
      return sendJson(res, 200, { ok: true, live: recordBeat(sid, ip, now, now) });
    });
    return;
  }

  if (req.method === "POST" && u.pathname === "/score") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 4096) req.destroy(); });
    req.on("end", () => {
      let d;
      try { d = JSON.parse(body); } catch (_) { return sendJson(res, 400, { error: "bad json" }); }
      const uid = String(d.uid || "").slice(0, 64);
      const token = String(d.token || "").slice(0, 128);
      if (!uid || !token) return sendJson(res, 400, { error: "uid/token requis" });
      const pseudo = cleanPseudo(d.pseudo);
      const incoming = clampInt(d.total);
      const cur = scores[uid];
      if (!cur) {
        scores[uid] = { token, pseudo, total: Math.min(incoming, FIRST_CAP) };
      } else {
        if (cur.token !== token) return sendJson(res, 403, { error: "token invalide" });
        const capped = Math.min(incoming, cur.total + DELTA_CAP);
        cur.total = Math.max(cur.total, clampInt(capped)); // monotone
        cur.pseudo = pseudo;
      }
      save();
      const lb = leaderboard(1, uid);
      return sendJson(res, 200, { ok: true, rank: lb.you ? lb.you.rank : null, total: scores[uid].total });
    });
    return;
  }

  sendJson(res, 404, { error: "not found" });
});

if (require.main === module) {
  server.listen(PORT, "127.0.0.1", () =>
    console.log("WebDeGentil scoreboard → http://127.0.0.1:" + PORT)
  );
}

module.exports = {
  leaderboard, recordBeat, computeLive, computeStats, _reset,
  checkAdminKey, adminScores,
  scores, stats, LIVE_CAP_PER_IP, LIVE_WINDOW,
};
