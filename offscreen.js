// Un web de gentil — document OFFSCREEN (IA locale, OPT-IN, 100 % local) — RELAIS
// ---------------------------------------------------------------------------
// Rôle : RELAYER les demandes de score entre le service worker et l'iframe SANDBOXÉE
// qui exécute réellement TF.js + le modèle. POURQUOI : le CSP MV3 `extension_pages`
// interdit `'unsafe-eval'`, dont TF.js a besoin (new Function) -> EvalError si on charge
// tf.min.js ICI. La solution canonique : faire tourner TF.js dans une iframe SANDBOXÉE
// (le CSP des pages `sandbox` autorise eval), hébergée par CE document. Ce document
// reste NON sandboxé car il a besoin des API chrome.* (runtime + storage) que la sandbox
// n'a pas. Chaîne complète :
//   service worker <-> (chrome.runtime) <-> offscreen.js <-> (postMessage) <-> iframe (sandbox.js : TF.js)
//
// Ce fichier ne tourne QUE si l'utilisateur a activé l'option « IA locale » (le SW ne
// crée le document offscreen que dans ce cas). FAIL-SAFE absolu : toute erreur (iframe
// KO, modèle KO, message perdu) -> on répond { score:0, error } et on ne lève JAMAIS
// d'exception qui pourrait casser quoi que ce soit en amont.
//
// Le modèle DATA (~25 Mo) est téléchargé au runtime DANS la sandbox depuis
// storage.googleapis.com / tfhub.dev (autorisé par le CSP `sandbox` du manifeste).
// AUCUN code distant : tf.min.js et toxicity.min.js sont packagés dans vendor/.
"use strict";

const TAG = "UWG-AI[offscreen]";

// SOURCE DE VÉRITÉ unique de l'état IA, lue par le popup : chrome.storage.local.uwg_ai_status
//   "loading" | "ready" | "error: <message>"  (absente / "off" quand l'IA est désactivée).
// CHAQUE mode d'échec doit finir écrit ici pour rester OBSERVABLE. Les statuts viennent
// désormais de la sandbox (loading/ready/error du MODÈLE) — on les relaie tels quels,
// avec EXACTEMENT les mêmes chaînes (le popup les lit déjà ainsi).
const AI_STATUS_KEY = "uwg_ai_status";
function setStatus(value) {
  // Écriture fail-safe : ne JAMAIS lever (une erreur de storage ne doit rien casser).
  try { chrome.storage.local.set({ [AI_STATUS_KEY]: value }); } catch (_) {}
}

// Iframe sandboxée qui exécute TF.js. Récupérée au chargement du document.
const sandbox = document.getElementById("uwg-sandbox");

// Demandes de score en attente d'une réponse de la sandbox, indexées par id.
// Chaque entrée : { sendResponse, timer }. On résout dès que la sandbox poste le result
// correspondant (ou au timeout de secours).
const pending = new Map();

// Relaie une réponse (score) vers le service worker, EXACTEMENT comme avant :
// via sendResponse (canal direct) ET via un message dédié (filet si le canal a expiré).
function answerSW(entry, score, error) {
  const payload = { type: "classify-result", id: entry.id, score: typeof score === "number" ? score : 0 };
  if (error) payload.error = error;
  try { if (entry.timer) clearTimeout(entry.timer); } catch (_) {}
  try { if (typeof entry.sendResponse === "function") entry.sendResponse(payload); } catch (_) { /* canal déjà fermé : filet ci-dessous */ }
  // Filet : on émet aussi un message dédié (utile si le canal sendResponse a expiré).
  try { chrome.runtime.sendMessage(payload); } catch (_) {}
}

// Écoute les messages de l'iframe sandboxée. Deux formes :
//   { src:'uwg-sandbox', kind:'status', status }  -> on publie l'état dans uwg_ai_status
//   { src:'uwg-sandbox', kind:'result', id, score } -> on résout la demande SW de cet id
window.addEventListener("message", (ev) => {
  const msg = ev && ev.data;
  if (!msg || msg.src !== "uwg-sandbox") return; // pas de la sandbox
  try {
    if (msg.kind === "status" && typeof msg.status === "string") {
      // On relaie le statut du MODÈLE tel quel (loading/ready/error: …) — observable popup.
      setStatus(msg.status);
      return;
    }
    if (msg.kind === "result") {
      const entry = pending.get(msg.id);
      if (!entry) return; // déjà résolu (timeout) ou inconnu : on ignore
      pending.delete(msg.id);
      answerSW(entry, msg.score, msg.error);
    }
  } catch (_) { /* fail-safe : un message bizarre ne doit rien casser */ }
});

// Écoute les demandes du service worker. Forme attendue (CONTRAT INCHANGÉ) :
//   { target:'offscreen', type:'classify', id, text }
// On forwarde à l'iframe ; quand elle répond, answerSW renvoie au SW via sendResponse ET
// un message dédié (comme avant). Réponse : { type:'classify-result', id, score }
// (score=0 + error en cas de souci).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // On ne traite QUE les messages qui nous sont destinés.
  if (!msg || msg.target !== "offscreen" || msg.type !== "classify") return; // pas pour nous
  const id = msg.id;
  const text = typeof msg.text === "string" ? msg.text : "";
  // Tout est encapsulé : aucune exception ne s'échappe d'ici.
  try {
    const entry = { id, sendResponse, timer: null };
    // Timeout de secours (~90 s) : le 1er chargement télécharge ~25 Mo dans la sandbox.
    // Si la sandbox ne répond jamais -> on répond score 0 (fail-safe), demande nettoyée.
    entry.timer = setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); answerSW(entry, 0, "timeout sandbox (90 s)"); }
    }, 90000);
    pending.set(id, entry);
    const win = sandbox && sandbox.contentWindow;
    if (!win) {
      // iframe pas encore prête / absente : fail-safe immédiat.
      pending.delete(id);
      answerSW(entry, 0, "iframe sandbox indisponible");
    } else {
      console.log(TAG, "relais d'une demande de score vers la sandbox", id);
      win.postMessage({ src: "uwg-offscreen", kind: "classify", id, text }, "*");
    }
  } catch (err) {
    // FAIL-SAFE : sur toute erreur, score 0 (= « pas une attaque ») -> l'extension reste
    // en mode liste-de-mots, rien n'est adouci par erreur, rien ne casse.
    answerSW({ id, sendResponse, timer: null }, 0, (err && err.message) || String(err));
  }
  return true; // réponse asynchrone
});

// L'iframe sandbox se charge toute seule (src="sandbox.html") et lance le chargement
// EAGER du modèle dès qu'elle est prête (= ce document existe, donc l'IA est activée).
// Elle poste loading -> ready|error au fil de l'eau ; on les relaie dans uwg_ai_status.
// Rien à déclencher ici : on attend simplement les messages.
console.log(TAG, "relais prêt — iframe sandbox prête à charger le modèle (TF.js eval autorisé dans la sandbox)");
