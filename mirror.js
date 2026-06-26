// Un web de gentil — Miroir gentil
// Avant que TOI tu postes un message dur, propose une version douce.
// Non-intrusif : n'agit QUE si ton brouillon est detecte mechant, et te laisse
// toujours « envoyer quand meme ». Module autonome (lit son etat dans storage).
(() => {
  "use strict";

  const CORE = (typeof window !== "undefined" && window.UWGCore) || globalThis.UWGCore;
  if (!CORE) return;

  const STORAGE_KEY = "uwg_state";
  const DEFAULTS = { mirror: true, theme: "nounours" };
  const cfg = Object.assign({}, DEFAULTS);

  const PAGE_LANG = (
    document.documentElement.getAttribute("lang") ||
    navigator.language ||
    "en"
  ).slice(0, 2).toLowerCase();

  const approved = new WeakSet(); // champs que l'utilisateur a valide "envoyer quand meme"
  let bubble = null;

  function isEditable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === "TEXTAREA") return true;
    if (tag === "INPUT") {
      const t = (el.type || "text").toLowerCase();
      return ["text", "search", "url", ""].includes(t);
    }
    return false;
  }
  function fieldText(el) {
    if (el.isContentEditable) return el.textContent || "";
    if ("value" in el) return el.value || "";
    return "";
  }
  function setFieldText(el, txt) {
    if (el.isContentEditable) {
      el.textContent = txt;
    } else {
      el.value = txt;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  function removeBubble() {
    if (bubble) { bubble.remove(); bubble = null; }
  }

  function showMirror(el, lang) {
    removeBubble();
    const soft = CORE.reply({ theme: cfg.theme, intensity: "doux", lang, seed: fieldText(el) });

    bubble = document.createElement("div");
    bubble.className = "uwg-mirror";
    bubble.innerHTML =
      '<div class="uwg-mirror-h">🪞 Un web de gentil</div>' +
      '<div class="uwg-mirror-b">Ton message a l\'air un peu dur. Tu veux l\'adoucir ?</div>' +
      '<div class="uwg-mirror-s"></div>' +
      '<div class="uwg-mirror-actions">' +
      '<button class="uwg-mirror-soft" type="button">Adoucir 🧸</button>' +
      '<button class="uwg-mirror-keep" type="button">Envoyer quand même</button>' +
      "</div>";
    bubble.querySelector(".uwg-mirror-s").textContent = soft;
    document.body.appendChild(bubble);

    // positionnement (fixed = coordonnees viewport)
    const r = el.getBoundingClientRect();
    const top = Math.max(8, r.top - bubble.offsetHeight - 8);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - bubble.offsetWidth - 8));
    bubble.style.top = top + "px";
    bubble.style.left = left + "px";

    bubble.querySelector(".uwg-mirror-soft").addEventListener("click", () => {
      setFieldText(el, soft);
      approved.add(el); // la version douce est OK
      removeBubble();
      el.focus();
    });
    bubble.querySelector(".uwg-mirror-keep").addEventListener("click", () => {
      approved.add(el); // l'utilisateur assume : on ne re-bloque pas
      removeBubble();
      el.focus();
    });
  }

  function maybeIntercept(el, ev) {
    if (!cfg.mirror) return;
    if (!isEditable(el)) return;
    if (approved.has(el)) return;
    const txt = fieldText(el);
    if (!txt || txt.trim().length < 2) return;
    const lang = CORE.detect(txt, PAGE_LANG);
    if (!lang) return;
    ev.preventDefault();
    ev.stopPropagation();
    showMirror(el, lang);
  }

  // Enter (sans Shift) dans un champ editable = tentative d'envoi
  document.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key !== "Enter" || ev.shiftKey || ev.isComposing) return;
      maybeIntercept(ev.target, ev);
    },
    true
  );

  // Soumission de formulaire
  document.addEventListener(
    "submit",
    (ev) => {
      const el = ev.target.querySelector("textarea, input, [contenteditable=true]");
      if (el) maybeIntercept(el, ev);
    },
    true
  );

  // si l'utilisateur re-modifie le texte, on re-verifiera
  document.addEventListener(
    "input",
    (ev) => { if (approved.has(ev.target)) approved.delete(ev.target); },
    true
  );

  // ferme la bulle si on clique ailleurs
  document.addEventListener(
    "mousedown",
    (ev) => {
      if (bubble && !bubble.contains(ev.target)) removeBubble();
    },
    true
  );

  chrome.storage.local.get(STORAGE_KEY, (res) => Object.assign(cfg, DEFAULTS, res[STORAGE_KEY]));
  chrome.storage.onChanged.addListener((c, a) => {
    if (a === "local" && c[STORAGE_KEY]) Object.assign(cfg, DEFAULTS, c[STORAGE_KEY].newValue);
  });
})();
