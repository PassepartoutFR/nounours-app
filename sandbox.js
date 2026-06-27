// Un web de gentil — IA locale, code de la SANDBOX (iframe sandboxée)
// ---------------------------------------------------------------------------
// Rôle : faire tourner TF.js + le petit modèle de toxicité LÀ OÙ `'unsafe-eval'`
// est autorisé. Le CSP MV3 `extension_pages` interdit eval ; TF.js en a besoin
// (new Function). On l'exécute donc ici, dans une iframe SANDBOXÉE (manifest
// `sandbox.pages`), dont le CSP autorise eval. Contrepartie : AUCUN accès aux API
// chrome.* (origine opaque). On ne communique QUE par postMessage avec le parent
// (= le document offscreen), qui relaie ensuite vers le service worker.
//
// FAIL-SAFE absolu : toute erreur (lib manquante, modèle KO, texte bizarre) ->
// on poste { score:0, error } et on ne lève JAMAIS d'exception non rattrapée.
"use strict";

(function () {
  const TAG = "UWG-AI[sandbox]";
  // Labels du modèle de toxicité. Score = max des probabilités "vrai" sur ces labels.
  const LABELS = ["toxicity", "insult", "identity_attack", "obscene", "threat", "severe_toxicity"];

  // Poste un message au parent (offscreen). Fail-safe : ne JAMAIS lever.
  function post(payload) {
    try { parent.postMessage(Object.assign({ src: "uwg-sandbox" }, payload), "*"); } catch (_) {}
  }
  function postStatus(status) { post({ kind: "status", status }); }

  let model = null;          // instance du modèle, une fois chargé
  let loadPromise = null;    // garde anti-double-chargement (load une seule fois)

  // Charge le modèle UNE seule fois. Backend CPU : fiable, pas besoin de WebGL
  // (instable/absent dans une iframe sandboxée). Poste l'état au parent à CHAQUE
  // étape (loading -> ready | error: …) — le parent l'écrit dans uwg_ai_status,
  // lu par le popup. Toute erreur remonte aussi au caller (qui répondra score 0).
  function ensureModel() {
    if (model) return Promise.resolve(model);
    if (loadPromise) return loadPromise;
    postStatus("loading");
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
      postStatus("ready");
      console.log(TAG, "modèle prêt ✓");
      return m;
    })().catch((err) => {
      // échec : on réarme la garde (nouvelle tentative possible plus tard), on PUBLIE
      // l'erreur (observable dans le popup via le parent) et on la propage au caller.
      loadPromise = null;
      const msg = (err && err.message) || String(err);
      postStatus("error: " + msg);
      console.warn(TAG, "échec du chargement du modèle :", msg);
      throw err;
    });
    return loadPromise;
  }

  // Calcule le score de toxicité d'un texte ∈ [0,1] = max des probabilités "vrai" sur
  // tous les labels. Même logique prouvée que offscreen.js/ai-lab.html.
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

  // Écoute les demandes du parent (offscreen). Forme attendue :
  //   { src:'uwg-offscreen', kind:'classify', id, text }
  // Réponse : { src:'uwg-sandbox', kind:'result', id, score }  (score=0 + error si souci).
  window.addEventListener("message", (ev) => {
    const msg = ev && ev.data;
    if (!msg || msg.src !== "uwg-offscreen" || msg.kind !== "classify") return; // pas pour nous
    const id = msg.id;
    const text = typeof msg.text === "string" ? msg.text : "";
    // Tout est encapsulé : aucune exception ne s'échappe d'ici.
    (async () => {
      try {
        const score = await scoreText(text);
        post({ kind: "result", id, score });
      } catch (err) {
        // FAIL-SAFE : sur toute erreur, score 0 (= « pas une attaque ») -> l'extension
        // reste en mode liste-de-mots, rien n'est adouci par erreur, rien ne casse.
        post({ kind: "result", id, score: 0, error: (err && err.message) || String(err) });
      }
    })();
  });

  // CHARGEMENT EAGER : dès que la sandbox se charge (= l'IA est activée, car l'offscreen
  // n'est créé que dans ce cas), on lance le chargement du modèle sans attendre une 1re
  // demande de score. L'état (loading -> ready | error) est posté au parent -> popup.
  // Fail-safe : on avale toute exception ici (ensureModel publie déjà l'erreur).
  console.log(TAG, "prêt — chargement EAGER du modèle au démarrage de la sandbox");
  try { ensureModel().catch(() => {}); } catch (_) {}
})();
