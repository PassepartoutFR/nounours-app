// Un web de gentil — service worker
// 1) badge (nombre de câlins) par onglet  2) classement : identite anonyme + sync
// 3) Feature #2 : listes de détection éditables à distance (OPT-IN, défaut OFF).
importScripts("scoreboard.js");

const perTab = {};
let lastSync = 0;

// ---------------------------------------------------------------------------
// Feature #2 — listes de détection éditables à distance (DATA ONLY, fail-safe)
// ---------------------------------------------------------------------------
// 100% LOCAL PAR DÉFAUT : on ne contacte le serveur QUE si l'utilisateur a coché
// « Mettre à jour les listes en ligne » (state.remoteLists, défaut FALSE). Quand
// c'est OFF : ZÉRO appel réseau pour les listes. Quand c'est ON : on récupère
// /lists périodiquement, on met en cache (uwg_lists) et on échoue en silence
// (les listes intégrées restent la source de vérité). DATA ONLY : on ne stocke
// que du JSON de chaînes, jamais exécuté.
const STATE_KEY = "uwg_state";
const LISTS_KEY = "uwg_lists";
const EP_KEY = "uwg_endpoint";
const DEFAULT_EP = "https://nounours.app/api";

function getState() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([STATE_KEY, EP_KEY], (r) => {
        const st = (r && r[STATE_KEY]) || {};
        const ep = String((r && r[EP_KEY]) || DEFAULT_EP).replace(/\/+$/, "");
        resolve({ optedIn: st.remoteLists === true, endpoint: ep });
      });
    } catch (_) { resolve({ optedIn: false, endpoint: DEFAULT_EP }); }
  });
}

// Récupère les overrides distants et les met en cache. NE FAIT RIEN si opt-in OFF.
// Tout est encapsulé dans try/catch : la moindre erreur => on garde le cache/les
// listes intégrées (fail-safe). On borne le JSON lu (anti-abus mémoire).
async function refreshLists() {
  try {
    const { optedIn, endpoint } = await getState();
    if (!optedIn) return; // OFF : aucun appel réseau
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let data;
    try {
      const resp = await fetch(endpoint + "/lists", { method: "GET", signal: ctrl.signal });
      if (!resp || !resp.ok) return; // fail-safe
      const text = await resp.text();
      if (text.length > 1048576) return; // > 1 Mo : on ignore (anti-abus)
      data = JSON.parse(text);
    } finally { clearTimeout(timer); }
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    chrome.storage.local.set({ [LISTS_KEY]: data });
  } catch (_) { /* réseau/parse KO : on garde les listes intégrées (fail-safe) */ }
}

function maybeSync() {
  const now = Date.now();
  if (now - lastSync < 8000) return; // debounce : 1 envoi / 8 s max
  lastSync = now;
  self.UWGBoard.postScore().catch(() => {}); // best-effort (serveur peut etre offline)
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== "uwg_count" || !sender.tab) return;
  const id = sender.tab.id;
  perTab[id] = (perTab[id] || 0) + (msg.delta || 0);
  const text = perTab[id] > 999 ? "999+" : String(perTab[id]);
  chrome.action.setBadgeText({ tabId: id, text });
  chrome.action.setBadgeBackgroundColor({ tabId: id, color: "#A67C52" });
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ tabId: id, color: "#FFFFFF" });
  }
  maybeSync();
});

// ---------------------------------------------------------------------------
// Feature — IA LOCALE (OPT-IN, défaut OFF). Pont content-script -> offscreen.
// ---------------------------------------------------------------------------
// 100 % LOCAL ET OPT-IN : on ne crée le document offscreen, ni ne touche au modèle,
// QUE si l'utilisateur a activé state.aiMode. Quand c'est OFF : ZÉRO document
// offscreen, ZÉRO fetch de modèle, comportement STRICTEMENT identique à aujourd'hui.
// FAIL-SAFE total : la moindre erreur (offscreen KO, modèle KO, message perdu) ->
// on répond { score:0 } et le content-script reste en mode liste-de-mots.
const AI_TAG = "UWG-AI[sw]";
const AI_CACHE_CAP = 500;          // borne mémoire : Map texte->score
const aiCache = new Map();         // cache des scores (clé = texte brut)
const aiInflight = new Map();      // dédoublonnage des demandes simultanées (texte -> Promise)
let offscreenCreating = null;      // garde anti-course pour la création du document

// SOURCE DE VÉRITÉ unique de l'état IA, lue par le popup (cf. offscreen.js) :
//   chrome.storage.local.uwg_ai_status = "loading"|"ready"|"error: <msg>" (|"off"/absente).
// Le popup affiche ce qui s'y trouve. On y écrit ici les échecs de CRÉATION du document
// offscreen (l'offscreen lui-même publie loading/ready/error du MODÈLE).
const AI_STATUS_KEY = "uwg_ai_status";
function setAiStatus(value) {
  // fail-safe : ne jamais lever.
  try { chrome.storage.local.set({ [AI_STATUS_KEY]: value }); } catch (_) {}
}
function getAiStatus() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(AI_STATUS_KEY, (r) => resolve((r && r[AI_STATUS_KEY]) || null));
    } catch (_) { resolve(null); }
  });
}

function aiEnabled() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(STATE_KEY, (r) => {
        const st = (r && r[STATE_KEY]) || {};
        resolve(st.aiMode === true); // défaut OFF
      });
    } catch (_) { resolve(false); }
  });
}

// Crée le document offscreen UNE seule fois (garde hasDocument + promesse de création
// pour éviter les courses). Toute erreur est avalée (fail-safe).
async function ensureOffscreen() {
  try {
    if (chrome.offscreen && chrome.offscreen.hasDocument) {
      const has = await chrome.offscreen.hasDocument();
      if (has) return true;
    }
    if (offscreenCreating) { await offscreenCreating; return true; }
    offscreenCreating = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["DOM_SCRAPING"],
      justification: "Run a local toxicity model for opt-in AI filtering."
    });
    await offscreenCreating;
    offscreenCreating = null;
    console.log(AI_TAG, "document offscreen créé");
    return true;
  } catch (err) {
    offscreenCreating = null;
    // « document déjà existant » = course gagnée par un autre appel : ce n'est pas un échec.
    const m = (err && err.message) || String(err);
    if (/single offscreen|already/i.test(m)) return true;
    // Échec RÉEL de création : on le rend OBSERVABLE dans le popup (même une création
    // ratée doit être visible — sinon le modèle ne se chargera jamais sans explication).
    setAiStatus("error: offscreen " + m);
    console.warn(AI_TAG, "création offscreen impossible :", m);
    return false;
  }
}

// Demande un score à l'offscreen pour un texte donné. Renvoie toujours un nombre
// (0 en cas d'échec). Borné par un timeout pour ne jamais laisser le content-script
// attendre indéfiniment.
function classifyViaOffscreen(text) {
  return new Promise((resolve) => {
    let done = false;
    const id = "uwg-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    const finish = (score) => { if (done) return; done = true; resolve(typeof score === "number" ? score : 0); };
    const timer = setTimeout(() => finish(0), 15000); // filet : 15 s max
    try {
      chrome.runtime.sendMessage({ target: "offscreen", type: "classify", id, text }, (resp) => {
        // lastError = offscreen absent/canal fermé : fail-safe -> 0
        if (chrome.runtime.lastError) { clearTimeout(timer); finish(0); return; }
        if (resp && resp.id === id) { clearTimeout(timer); finish(resp.score); }
      });
    } catch (_) { clearTimeout(timer); finish(0); }
  });
}

async function aiScore(text) {
  // cache : déjà connu ?
  if (aiCache.has(text)) return aiCache.get(text);
  // dédoublonnage : une demande identique est déjà en vol ?
  if (aiInflight.has(text)) return aiInflight.get(text);
  const p = (async () => {
    const ok = await ensureOffscreen();
    if (!ok) return 0; // offscreen indisponible -> fail-safe
    const score = await classifyViaOffscreen(text);
    // mémorise (borne : on évacue la plus ancienne entrée si on dépasse le cap)
    try {
      aiCache.set(text, score);
      if (aiCache.size > AI_CACHE_CAP) { const k = aiCache.keys().next().value; aiCache.delete(k); }
    } catch (_) {}
    return score;
  })();
  aiInflight.set(text, p);
  try { return await p; }
  finally { aiInflight.delete(text); }
}

// Handler dédié pour les demandes de score du content-script. SÉPARÉ du handler
// uwg_count ci-dessus pour pouvoir renvoyer `true` (réponse asynchrone) proprement.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "uwg-ai-score") return; // pas pour nous
  (async () => {
    try {
      const on = await aiEnabled();
      if (!on || typeof msg.text !== "string" || !msg.text) { sendResponse({ score: 0 }); return; }
      const score = await aiScore(msg.text);
      sendResponse({ score: typeof score === "number" ? score : 0 });
    } catch (err) {
      // FAIL-SAFE : toute erreur -> score 0, le content-script reste en mode liste.
      console.warn(AI_TAG, "uwg-ai-score erreur :", (err && err.message) || err);
      try { sendResponse({ score: 0 }); } catch (_) {}
    }
  })();
  return true; // réponse asynchrone
});

// ---------------------------------------------------------------------------
// IA LOCALE — chargement EAGER + observabilité
// ---------------------------------------------------------------------------
// Quand l'utilisateur ACTIVE l'IA (aiMode -> true), on crée immédiatement le document
// offscreen : sa simple création déclenche le chargement EAGER du modèle (offscreen.js),
// qui publie loading -> ready|error dans uwg_ai_status. L'utilisateur voit donc l'état
// tout de suite, sans attendre un 1er « cas gris ». Quand il DÉSACTIVE (aiMode -> false),
// on remet le statut à "off" et on ferme le document (fail-safe). Toute erreur de création
// est déjà publiée par ensureOffscreen() -> reste observable dans le popup.
async function onAiEnabled() {
  console.log(AI_TAG, "IA activée -> création offscreen + chargement eager du modèle");
  // ensureOffscreen() publie lui-même une erreur de création le cas échéant.
  await ensureOffscreen();
}

async function onAiDisabled() {
  console.log(AI_TAG, "IA désactivée -> fermeture offscreen + statut off");
  setAiStatus("off");
  try {
    if (chrome.offscreen && chrome.offscreen.closeDocument) {
      // ne ferme que s'il existe (évite une exception « no offscreen document »).
      let has = true;
      if (chrome.offscreen.hasDocument) { try { has = await chrome.offscreen.hasDocument(); } catch (_) { has = true; } }
      if (has) await chrome.offscreen.closeDocument();
    }
  } catch (_) { /* fail-safe : fermeture best-effort */ }
}

// Réagit aux bascules de aiMode (le popup écrit uwg_state via patch()). On compare
// l'ancienne et la nouvelle valeur pour n'agir que sur un VRAI changement.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STATE_KEY]) return;
  try {
    const before = (changes[STATE_KEY].oldValue && changes[STATE_KEY].oldValue.aiMode) === true;
    const after = (changes[STATE_KEY].newValue && changes[STATE_KEY].newValue.aiMode) === true;
    if (before === after) return; // pas un changement de aiMode
    if (after) onAiEnabled(); else onAiDisabled();
  } catch (_) { /* fail-safe */ }
});

// Au démarrage du service worker : si l'IA est DÉJÀ activée, on (re)lance le chargement
// eager immédiatement (le SW MV3 a pu être tué entre deux ; on ne veut pas attendre un
// cas gris pour que l'état redevienne observable). No-op si aiMode est OFF.
(async () => {
  try {
    const on = await aiEnabled();
    if (on) onAiEnabled();
  } catch (_) { /* fail-safe */ }
})();

// Handler de TEST explicite : déclenché par le bouton « 🧪 Tester l'IA » du popup.
// Contourne la porte « cas gris » (c'est un test volontaire de l'utilisateur) : on
// classe le texte EXACT fourni, puis on renvoie { score, status } (status = état courant
// de uwg_ai_status). Entièrement try/catch -> { score:null, error } en cas de pépin.
// Attend que le modèle soit PRÊT (ou en erreur) en sondant uwg_ai_status. Le 1er
// chargement télécharge ~25 Mo : sans cette attente, un test lancé trop tôt retombe
// sur le timeout de classifyViaOffscreen et affiche un faux « 0.00 ». On distingue
// donc explicitement : prêt / erreur exacte / encore en chargement.
function waitForModelReady(timeoutMs) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tick = async () => {
      const st = await getAiStatus();
      if (st === "ready") return resolve({ ready: true });
      if (typeof st === "string" && st.indexOf("error") === 0) return resolve({ ready: false, error: st });
      if (Date.now() - t0 > timeoutMs) return resolve({ ready: false, loading: true });
      setTimeout(tick, 600);
    };
    tick();
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "uwg-ai-test") return; // pas pour nous
  (async () => {
    try {
      const text = typeof msg.text === "string" ? msg.text : "";
      const ok = await ensureOffscreen();
      if (!ok) {
        // création offscreen impossible : ensureOffscreen a déjà publié l'erreur.
        const status = await getAiStatus();
        sendResponse({ score: null, status, error: (status && status.indexOf("error") === 0) ? status : "offscreen indisponible" });
        return;
      }
      // ATTEND que le modèle finisse de charger (jusqu'à 90 s pour les ~25 Mo) AVANT de
      // classer — sinon on renvoie un faux 0. On dit la vérité : erreur exacte ou « encore en charge ».
      const r = await waitForModelReady(90000);
      if (r.error) { sendResponse({ score: null, status: r.error, error: r.error }); return; }
      if (!r.ready) { sendResponse({ score: null, status: "loading", error: "modèle encore en chargement (~25 Mo) — réessaie dans quelques secondes" }); return; }
      const score = await classifyViaOffscreen(text);
      sendResponse({ score: typeof score === "number" ? score : null, status: "ready" });
    } catch (err) {
      const e = (err && err.message) || String(err);
      console.warn(AI_TAG, "uwg-ai-test erreur :", e);
      try { sendResponse({ score: null, error: e }); } catch (_) {}
    }
  })();
  return true; // réponse asynchrone
});

chrome.tabs.onRemoved.addListener((id) => { delete perTab[id]; });

chrome.tabs.onUpdated.addListener((id, info) => {
  if (info.status === "loading") {
    perTab[id] = 0;
    chrome.action.setBadgeText({ tabId: id, text: "" });
  }
});

// cree l'identite anonyme des l'installation
chrome.runtime.onInstalled.addListener(() => {
  self.UWGBoard.ensureAccount();
  refreshLists(); // no-op si opt-in OFF (défaut) : aucun appel réseau
});

// au démarrage du navigateur : rafraîchit aussi (no-op si opt-in OFF)
if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(() => { refreshLists(); });
}

// filet de securite : resync periodique (au cas ou un envoi a echoue)
chrome.alarms.create("uwg-sync", { periodInMinutes: 5 });
// Feature #2 — rafraîchissement périodique des listes (toutes les ~6 h). L'alarme
// existe toujours, mais refreshLists() ne fait RIEN tant que l'opt-in est OFF.
chrome.alarms.create("uwg-lists", { periodInMinutes: 360 });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "uwg-sync") self.UWGBoard.postScore().catch(() => {});
  if (a.name === "uwg-lists") refreshLists();
});

// ---------------------------------------------------------------------------
// Feature — notification « mise à jour disponible » pour les testeurs side-load
// ---------------------------------------------------------------------------
// Les utilisateurs qui ont installé l'extension à la main (GitHub Releases) NE
// reçoivent PAS les mises à jour automatiques du store. On vérifie donc, en
// arrière-plan, la dernière release publiée et, si elle est plus récente que la
// version installée, on le mémorise dans chrome.storage.local (clé uwg_update).
// Le POPUP seul affiche la bannière — on NE TOUCHE JAMAIS au badge (réservé au
// compteur de câlins par onglet). FAIL-SAFE total : toute erreur réseau/parse
// est avalée en silence => aucune bannière, aucun effet de bord.
const UPD_TAG = "UWG-UPD";
const UPD_ALARM = "uwg-update-check";
const UPD_KEY = "uwg_update";
const UPD_LATEST = "https://api.github.com/repos/PassepartoutFR/nounours-app/releases/latest";

// Compare deux versions « x.y.z ». Renvoie true SSI `latest` est STRICTEMENT
// plus récente que `current`. Découpe sur "." ; chaque segment non numérique
// compte pour 0 ; la version la plus longue/grande gagne. Jamais d'exception.
function isNewer(latest, current) {
  try {
    const a = String(latest || "").split(".");
    const b = String(current || "").split(".");
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const x = parseInt(a[i], 10); const y = parseInt(b[i], 10);
      const xi = Number.isFinite(x) ? x : 0;
      const yi = Number.isFinite(y) ? y : 0;
      if (xi > yi) return true;
      if (xi < yi) return false;
    }
    return false;
  } catch (_) { return false; }
}

// Interroge GitHub, compare, et met à jour (ou efface) la clé uwg_update. Tout
// est encapsulé : la moindre erreur => on ne fait rien (fail-safe). Ne lève
// jamais, ne touche jamais au badge.
async function checkForUpdate() {
  try {
    const current = chrome.runtime.getManifest().version;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let data;
    try {
      const resp = await fetch(UPD_LATEST, {
        headers: { Accept: "application/vnd.github+json" },
        signal: ctrl.signal
      });
      if (!resp || !resp.ok) return; // fail-safe (404 si aucune release, etc.)
      data = await resp.json();
    } finally { clearTimeout(timer); }
    if (!data || typeof data !== "object") return;
    const tag = String(data.tag_name || "");
    const latest = tag.replace(/^v/i, ""); // "v0.7.5" -> "0.7.5"
    if (!latest) return;
    if (isNewer(latest, current)) {
      const url = (typeof data.html_url === "string" && data.html_url) ||
        "https://github.com/PassepartoutFR/nounours-app/releases/latest";
      chrome.storage.local.set({ [UPD_KEY]: { version: latest, url } });
      console.log(UPD_TAG, "maj dispo v" + latest);
    } else {
      chrome.storage.local.remove(UPD_KEY); // à jour : on efface tout résidu
      console.log(UPD_TAG, "à jour (v" + current + ")");
    }
  } catch (_) { /* réseau/parse KO : aucune bannière (fail-safe) */ }
}

// Alarme périodique (~12 h) + une vérification peu après le démarrage. L'alarme
// est (re)créée à l'install et au démarrage ; le listener est SÉPARÉ de celui
// ci-dessus (Chrome autorise plusieurs onAlarm) pour rester strictement additif.
function ensureUpdateAlarm() {
  try { chrome.alarms.create(UPD_ALARM, { periodInMinutes: 720 }); } catch (_) {}
}
ensureUpdateAlarm();
chrome.alarms.onAlarm.addListener((a) => {
  if (a && a.name === UPD_ALARM) checkForUpdate();
});
chrome.runtime.onInstalled.addListener(() => { ensureUpdateAlarm(); checkForUpdate(); });
if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(() => { ensureUpdateAlarm(); checkForUpdate(); });
}
// premier contrôle peu après le démarrage du service worker (sans bloquer)
setTimeout(() => { checkForUpdate(); }, 5000);
