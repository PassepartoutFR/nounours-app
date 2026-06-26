// WebDeGentil — serveur de classement (sans dependance)
// Endpoints : GET /health · GET /leaderboard?limit=&uid= · POST /score
// Stockage : scores.json (a cote). "Connexion sans compte" : chaque addon a un
// uid + un token (= HMAC(secret, uid)). On fait du TOFU : le 1er /score fixe le
// token de l'uid ; ensuite il faut le meme token pour mettre a jour son score.
// Anti-triche LEGER (projet fun, systeme a l'honneur) : score monotone + plafonds.
"use strict";

const crypto = require("crypto");
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
// Faux positifs signales : compteurs AGREGES par langue (vie privee : aucun texte,
// aucune URL, jamais d'identifiant — juste {fr: n, en: n, ...}). Persiste avec stats.
if (!stats.reports || typeof stats.reports !== "object") stats.reports = {};

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
  stats.total = 0; stats.days = {}; stats.reports = {}; stats.geo = {}; live.clear(); counted.clear();
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

// Code de langue normalise : 2 lettres a-z minuscules (ex. "fr"). Tout le reste
// (texte, casse, chiffres, separateurs) est rejete -> "xx" (inconnu). Garantit que
// le compteur de faux positifs ne stocke QUE des codes de langue, jamais de texte.
function cleanLang(l) {
  let out = "";
  for (const ch of String(l == null ? "" : l).toLowerCase()) {
    const c = ch.codePointAt(0);
    if (c >= 97 && c <= 122) out += ch; // a-z
    if (out.length >= 2) break;
  }
  return out.length === 2 ? out : "xx";
}

// Feature #4 — incremente le compteur AGREGE de faux positifs pour une langue.
// Ne stocke qu'un nombre par code de langue (zero texte, zero URL). Renvoie le total.
function recordReport(lang) {
  const k = cleanLang(lang);
  stats.reports[k] = (Number(stats.reports[k]) || 0) + 1;
  return stats.reports[k];
}

// Feature #6 — carte de chaleur de la gentillesse : compteur AGREGE par langue
// derive de l'en-tete Accept-Language. VIE PRIVEE : on n'incremente qu'un nombre
// par code de langue (2 lettres), JAMAIS l'IP, jamais par utilisateur, zero texte.
if (!stats.geo || typeof stats.geo !== "object") stats.geo = {};

// Extrait le 1er sous-tag primaire (2 lettres a-z) d'un Accept-Language, sinon "??".
// Ex. "fr-CA,fr;q=0.9,en;q=0.8" -> "fr". Tout le reste -> "??" (zero texte stocke).
function primaryLang(acceptLanguage) {
  const first = String(acceptLanguage == null ? "" : acceptLanguage).split(",")[0] || "";
  const tag = first.split(";")[0].split("-")[0].trim().toLowerCase();
  let out = "";
  for (const ch of tag) {
    const c = ch.codePointAt(0);
    if (c >= 97 && c <= 122) out += ch; else break;
    if (out.length >= 2) break;
  }
  return out.length === 2 ? out : "??";
}
function recordGeo(acceptLanguage) {
  const k = primaryLang(acceptLanguage);
  stats.geo[k] = (Number(stats.geo[k]) || 0) + 1;
  return k;
}
// Vue publique : { regions: [ {c, n}, ... ] } triee decroissant, top ~20.
function geo(limit) {
  const arr = Object.keys(stats.geo)
    .map((c) => ({ c, n: Number(stats.geo[c]) || 0 }))
    .filter((e) => e.n > 0)
    .sort((a, b) => b.n - a.n || a.c.localeCompare(b.c));
  const n = Number.isFinite(limit) && limit > 0 ? limit : 20;
  return { regions: arr.slice(0, n) };
}

// ---- Feature #2 : overrides (listes de detection editables a distance) -------
// Objet persiste sur disque : { lex:{fr:[...],...}, replies:{nounours:{fr:[...]},...} }.
// DATA ONLY : uniquement des tableaux de chaines. Jamais execute cote serveur ; le
// client (uwg-core.applyOverrides) les fusionne en pures donnees. Bornes dures.
const OV_FILE = path.join(__dirname, "overrides.json");
const OV_MAX_ARRAY = 500;  // entrees max par tableau
const OV_MAX_LEN = 200;    // caracteres max par entree
let overrides = {};
try {
  const raw = JSON.parse(fs.readFileSync(OV_FILE, "utf8"));
  if (raw && typeof raw === "object" && !Array.isArray(raw)) overrides = raw;
} catch (_) { overrides = {}; }

let ovTimer = null;
function saveOverrides() {
  clearTimeout(ovTimer);
  ovTimer = setTimeout(() => {
    try { fs.writeFileSync(OV_FILE, JSON.stringify(overrides)); }
    catch (e) { console.error("saveOverrides failed:", e.message); }
  }, 250);
}

// Valide+nettoie un dictionnaire { code: [chaines] } (lex par langue, replies par
// langue). Retourne null si une valeur n'est PAS un tableau de chaines (=> 400).
// Sinon retourne une copie nettoyee. Cles bornees a 32 car.
function sanitizeLangMap(map) {
  if (map == null) return {};
  if (typeof map !== "object" || Array.isArray(map)) return null;
  const out = {};
  for (const key of Object.keys(map)) {
    const arr = map[key];
    if (!Array.isArray(arr)) return null; // rejette tout non-tableau
    if (arr.length > OV_MAX_ARRAY) return null;
    const clean = [];
    for (const v of arr) {
      if (typeof v !== "string") return null; // rejette tout non-chaine
      if (v.length > OV_MAX_LEN) return null;
      clean.push(v);
    }
    out[String(key).slice(0, 32)] = clean;
  }
  return out;
}

// Valide le payload complet { lex?, replies? }. Renvoie {ok:true, value} ou
// {ok:false} (=> 400). Tout ce qui n'est pas "tableaux de chaines" est rejete.
function sanitizeOverrides(obj) {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return { ok: false };
  const value = {};
  if ("lex" in obj) {
    const lex = sanitizeLangMap(obj.lex);
    if (lex === null) return { ok: false };
    value.lex = lex;
  }
  if ("replies" in obj) {
    const reps = obj.replies;
    if (reps == null) {
      value.replies = {};
    } else if (typeof reps !== "object" || Array.isArray(reps)) {
      return { ok: false };
    } else {
      const outReps = {};
      for (const theme of Object.keys(reps)) {
        const byLang = sanitizeLangMap(reps[theme]);
        if (byLang === null) return { ok: false };
        outReps[String(theme).slice(0, 32)] = byLang;
      }
      value.replies = outReps;
    }
  }
  return { ok: true, value };
}

// Code d'equipe nettoye : caracteres imprimables, <= 24, sans donnee perso imposee.
// Vide -> "" (= quitter / pas d'equipe).
function cleanTeam(t) {
  let out = "";
  for (const ch of String(t == null ? "" : t)) {
    const c = ch.codePointAt(0);
    if (c >= 32 && c !== 127) out += ch;
  }
  return out.trim().slice(0, 24);
}

// Feature #10 — classement agrege des equipes : somme des totaux des membres par
// equipe, tri decroissant. [{rank, team, total, members}].
function teams(limit) {
  const agg = new Map(); // team -> { total, members }
  for (const v of Object.values(scores)) {
    const t = v && typeof v.team === "string" ? v.team : "";
    if (!t) continue;
    const cur = agg.get(t) || { total: 0, members: 0 };
    cur.total += clampInt(v.total || 0);
    cur.members += 1;
    agg.set(t, cur);
  }
  const arr = [...agg.entries()]
    .map(([team, a]) => ({ team, total: a.total, members: a.members }))
    .sort((a, b) => b.total - a.total || a.team.localeCompare(b.team));
  const n = Number.isFinite(limit) && limit > 0 ? limit : arr.length;
  return arr.slice(0, n).map((e, i) => ({ rank: i + 1, team: e.team, total: e.total, members: e.members }));
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

// Suppression autonome : token direct ou code DEL1 temporaire (15 min).
const DEL_TTL = 900;

function delSig(tokenHex, uid, exp) {
  const msg = `del:${uid}:${exp}`;
  try {
    return crypto.createHmac("sha256", Buffer.from(tokenHex, "hex")).update(msg).digest("hex");
  } catch (_) {
    return "";
  }
}

function verifyDeleteAuth(d, storedToken) {
  const uid = String(d && d.uid != null ? d.uid : "").slice(0, 64);
  if (!uid) return { ok: false, error: "uid requis" };
  const token = String(d.token || "").slice(0, 128);
  if (token) {
    if (storedToken !== token) return { ok: false, error: "token invalide" };
    return { ok: true, uid };
  }
  const sig = String(d.sig || "").slice(0, 128);
  const exp = d.exp;
  if (!sig || exp == null) return { ok: false, error: "preuve requise" };
  const expI = Number(exp);
  if (!Number.isFinite(expI) || expI < Date.now() / 1000) {
    return { ok: false, error: "code expire ou invalide" };
  }
  const expected = delSig(storedToken, uid, Math.floor(expI));
  if (!expected || expected !== sig) return { ok: false, error: "code invalide" };
  return { ok: true, uid };
}

function deleteAccount(d) {
  const uid = String(d && d.uid != null ? d.uid : "").slice(0, 64);
  if (!uid) return { code: 400, body: { error: "uid requis" } };
  const cur = scores[uid];
  if (!cur) return { code: 200, body: { ok: true, removed: false } };
  const auth = verifyDeleteAuth(d, cur.token);
  if (!auth.ok) {
    const code = auth.error && auth.error.includes("invalide") ? 403 : 400;
    return { code, body: { error: auth.error } };
  }
  delete scores[uid];
  save();
  return { code: 200, body: { ok: true, removed: true } };
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

  if (req.method === "GET" && u.pathname === "/teams") {
    const limit = Math.min(100, Math.max(1, parseInt(u.searchParams.get("limit") || "20", 10)));
    return sendJson(res, 200, { teams: teams(limit) });
  }

  // Feature #6 — carte de chaleur (PUBLIC) : { regions: [{c, n}, ...] } top ~20.
  if (req.method === "GET" && u.pathname === "/geo") {
    return sendJson(res, 200, geo(20));
  }

  // Feature #2 — listes editables (PUBLIC, lecture seule, cacheable) : renvoie les
  // overrides courants (DATA ONLY) ou {} si aucun. Le client les fusionne en donnees.
  if (req.method === "GET" && u.pathname === "/lists") {
    res.setHeader("Cache-Control", "public, max-age=300");
    return sendJson(res, 200, overrides || {});
  }

  // ---- Routes admin (gardees par X-Admin-Key vs NOUNOURS_ADMIN_KEY) ----------
  if (u.pathname === "/admin/overview" || u.pathname === "/admin/scores" ||
      u.pathname === "/admin/delete" || u.pathname === "/admin/lists") {
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
        reports: Object.assign({}, stats.reports),
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

    // Feature #2 — remplace les overrides (DATA ONLY). Corps borne a ~512 Ko (les
    // listes peuvent etre volumineuses : 500 entrees x 200 car x N langues). On
    // VALIDE strictement (tableaux de chaines, bornes) ; tout le reste -> 400.
    if (req.method === "POST" && u.pathname === "/admin/lists") {
      let body = "";
      req.on("data", (c) => { body += c; if (body.length > 524288) req.destroy(); });
      req.on("end", () => {
        let d;
        try { d = JSON.parse(body || "{}"); } catch (_) { return sendJson(res, 400, { error: "bad json" }); }
        const v = sanitizeOverrides(d);
        if (!v.ok) return sendJson(res, 400, { error: "overrides invalides (tableaux de chaines uniquement)" });
        overrides = v.value;
        saveOverrides();
        return sendJson(res, 200, { ok: true });
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
      const live = recordBeat(sid, ip, now, now);
      // Feature #6 — carte de chaleur : compteur agrege par langue (Accept-Language).
      // VIE PRIVEE : un nombre par code de langue, jamais l'IP, jamais par utilisateur.
      recordGeo(req.headers["accept-language"]);
      saveStats();
      return sendJson(res, 200, { ok: true, live });
    });
    return;
  }

  // Feature #4 — signalement de faux positif (PUBLIC, corps minuscule). Le corps ne
  // doit transporter QUE {lang}. On borne le corps a 256 o (anti-abus) et on
  // n'incremente qu'un compteur agrege par langue (zero texte stocke).
  if (req.method === "POST" && u.pathname === "/report") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 256) req.destroy(); });
    req.on("end", () => {
      let d = {};
      try { d = JSON.parse(body || "{}"); } catch (_) { d = {}; }
      const n = recordReport(d.lang);
      saveStats();
      return sendJson(res, 200, { ok: true, count: n });
    });
    return;
  }

  // Suppression autonome du classement (token direct ou code DEL1 temporaire).
  if (req.method === "POST" && u.pathname === "/account/delete") {
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "";
    if (!rateOk(ip)) return sendJson(res, 429, { error: "trop de requetes" });
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 4096) req.destroy(); });
    req.on("end", () => {
      let d;
      try { d = JSON.parse(body || "{}"); } catch (_) { return sendJson(res, 400, { error: "bad json" }); }
      const out = deleteAccount(d);
      return sendJson(res, out.code, out.body);
    });
    return;
  }

  // Feature #10 — rejoindre une equipe (token verifie comme /score). Body {uid, token, team}.
  if (req.method === "POST" && u.pathname === "/team/join") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 4096) req.destroy(); });
    req.on("end", () => {
      let d;
      try { d = JSON.parse(body); } catch (_) { return sendJson(res, 400, { error: "bad json" }); }
      const uid = String(d.uid || "").slice(0, 64);
      const token = String(d.token || "").slice(0, 128);
      if (!uid || !token) return sendJson(res, 400, { error: "uid/token requis" });
      const cur = scores[uid];
      if (!cur) return sendJson(res, 404, { error: "inconnu" });
      if (cur.token !== token) return sendJson(res, 403, { error: "token invalide" });
      const team = cleanTeam(d.team);
      if (team) cur.team = team; else delete cur.team;
      save();
      return sendJson(res, 200, { ok: true, team });
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
  recordReport, cleanLang, teams, cleanTeam,
  recordGeo, primaryLang, geo,
  sanitizeOverrides,
  delSig, verifyDeleteAuth, deleteAccount, DEL_TTL,
  scores, stats, LIVE_CAP_PER_IP, LIVE_WINDOW,
};
