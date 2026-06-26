// Un web de gentil — service worker
// 1) badge (nombre de câlins) par onglet  2) classement : identite anonyme + sync
importScripts("scoreboard.js");

const perTab = {};
let lastSync = 0;

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
});

// filet de securite : resync periodique (au cas ou un envoi a echoue)
chrome.alarms.create("uwg-sync", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "uwg-sync") self.UWGBoard.postScore().catch(() => {});
});
