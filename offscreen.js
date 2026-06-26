// Un web de gentil — document OFFSCREEN (IA locale, OPT-IN, 100 % local)
// ---------------------------------------------------------------------------
// Rôle : charger UNE fois le petit modèle de toxicité (TF.js, libs VENDORÉES) et
// répondre aux demandes de score envoyées par le service worker. Ce fichier ne
// tourne QUE si l'utilisateur a activé l'option « IA locale » (le SW ne crée le
// document offscreen que dans ce cas). FAIL-SAFE absolu : toute erreur (lib
// manquante, modèle KO, texte bizarre) -> on répond { score:0, error } et on ne
// lance JAMAIS d'exception qui pourrait casser quoi que ce soit en amont.
//
// Le modèle DATA (~25 Mo) est téléchargé au runtime depuis storage.googleapis.com
// / tfhub.dev (autorisé par le CSP du manifeste). AUCUN code distant : tf.min.js et
// toxicity.min.js sont packagés dans vendor/.
"use strict";

const TAG = "UWG-AI[offscreen]";
// Labels du modèle de toxicité. Score = max des probabilités "vrai" sur ces labels.
const LABELS = ["toxicity", "insult", "identity_attack", "obscene", "threat", "severe_toxicity"];

// SOURCE DE VÉRITÉ unique de l'état IA, lue par le popup : chrome.storage.local.uwg_ai_status
//   "loading" | "ready" | "error: <message>"  (absente / "off" quand l'IA est désactivée).
// CHAQUE mode d'échec doit finir écrit ici pour rester OBSERVABLE.
const AI_STATUS_KEY = "uwg_ai_status";
function setStatus(value) {
  // Écriture fail-safe : ne JAMAIS lever (une erreur de storage ne doit rien casser).
  try { chrome.storage.local.set({ [AI_STATUS_KEY]: value }); } catch (_) {}
}

let model = null;          // instance du modèle, une fois chargé
let loadPromise = null;    // garde anti-double-chargement (load une seule fois)

// Charge le modèle UNE seule fois. Force le backend CPU : fiable, pas besoin de WebGL
// (qui peut manquer/être instable dans un document offscreen). Écrit l'état dans
// uwg_ai_status à CHAQUE étape (loading -> ready | error: …) pour que le popup le voie.
// Toute erreur remonte aussi au caller (qui répondra { score:0 } — on ne casse rien).
function ensureModel() {
  if (model) return Promise.resolve(model);
  if (loadPromise) return loadPromise;
  setStatus("loading");
  console.log(TAG, "chargement du modèle…");
  loadPromise = (async () => {
    if (typeof tf === "undefined" || typeof toxicity === "undefined") {
      throw new Error("librairies tf/toxicity absentes (vendor non chargé)");
    }
    console.log(TAG, "chargement du modèle… (backend CPU, ~25 Mo la 1re fois)");
    await tf.setBackend("cpu"); // CPU : fiable, sans WebGL
    await tf.ready();
    // seuil interne 0.5 : on récupère les probabilités, on calcule le max nous-mêmes.
    const m = await toxicity.load(0.5, LABELS);
    model = m;
    setStatus("ready");
    console.log(TAG, "modèle prêt ✓");
    return m;
  })().catch((err) => {
    // échec : on réarme la garde pour autoriser une nouvelle tentative ultérieure,
    // on PUBLIE l'erreur (observable dans le popup) et on la propage au caller
    // (qui répondra score:0, fail-safe).
    loadPromise = null;
    const msg = (err && err.message) || String(err);
    setStatus("error: " + msg);
    console.warn(TAG, "échec du chargement du modèle :", msg);
    throw err;
  });
  return loadPromise;
}

// Calcule le score de toxicité d'un texte ∈ [0,1] = max des probabilités "vrai" sur
// tous les labels. Reproduit la logique prouvée d'ai-lab.html.
async function scoreText(text) {
  const m = await ensureModel();
  const preds = await m.classify([String(text)]);
  let max = 0;
  for (const p of preds) {
    const pr = p && p.results && p.results[0] && p.results[0].probabilities
      ? p.results[0].probabilities[1] : 0;
    if (typeof pr === "number" && pr > max) max = pr;
  }
  return max;
}

// Écoute les demandes du service worker. Forme attendue :
//   { target:'offscreen', type:'classify', id, text }
// Réponse (via sendResponse ET un message dédié, pour robustesse) :
//   { type:'classify-result', id, score }   (score=0 + error en cas de souci)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // On ne traite QUE les messages qui nous sont destinés.
  if (!msg || msg.target !== "offscreen" || msg.type !== "classify") return; // pas pour nous
  const id = msg.id;
  const text = typeof msg.text === "string" ? msg.text : "";
  // Tout est encapsulé : aucune exception ne s'échappe d'ici.
  (async () => {
    let payload;
    try {
      const score = await scoreText(text);
      payload = { type: "classify-result", id, score };
    } catch (err) {
      // FAIL-SAFE : sur toute erreur, score 0 (= « pas une attaque ») -> l'extension
      // reste en mode liste-de-mots, rien n'est adouci par erreur, rien ne casse.
      payload = { type: "classify-result", id, score: 0, error: (err && err.message) || String(err) };
    }
    try { sendResponse(payload); } catch (_) { /* canal déjà fermé : on s'appuie sur le message ci-dessous */ }
    // Filet : on émet aussi un message dédié (utile si le canal sendResponse a expiré).
    try { chrome.runtime.sendMessage(payload); } catch (_) {}
  })();
  return true; // réponse asynchrone
});

// CHARGEMENT EAGER : dès que ce document offscreen se charge (= l'IA est activée, car
// le SW ne crée ce document QUE dans ce cas), on lance le chargement du modèle sans
// attendre une 1re demande de score. L'état (loading -> ready | error) est publié dans
// uwg_ai_status -> le popup peut le montrer. Fail-safe : on avale toute exception ici
// (ensureModel publie déjà l'erreur dans le storage ; le handler classify la reverra).
console.log(TAG, "prêt — chargement EAGER du modèle au démarrage du document");
try { ensureModel().catch(() => {}); } catch (_) {}
