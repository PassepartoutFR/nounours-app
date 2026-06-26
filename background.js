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
