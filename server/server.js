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

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

server.listen(PORT, "127.0.0.1", () =>
  console.log("WebDeGentil scoreboard → http://127.0.0.1:" + PORT)
);
