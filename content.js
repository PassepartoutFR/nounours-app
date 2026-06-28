// Un web de gentil — content script
// Utilise le noyau (uwg-core.js, charge avant). Detecte les textes mechants et
// les remplace selon le THEME + l'INTENSITE choisis, avec confettis + niveaux.
(() => {
  "use strict";

  const CORE = (typeof window !== "undefined" && window.UWGCore) || globalThis.UWGCore;
  if (!CORE) return; // noyau absent : on ne casse rien

  // Board (compte sans compte) — présent dans le popup, PAS dans le content script
  // (scoreboard.js n'est pas injecté ici). On l'utilise s'il existe, sinon on poste
  // nous-mêmes le signalement (langue SEULE) via l'endpoint stocké.
  const BOARD = (typeof window !== "undefined" && window.UWGBoard) || null;
  const EP_KEY = "uwg_endpoint";
  const DEFAULT_EP = "https://nounours.app/api";

  // Envoie un signalement de faux positif. VIE PRIVÉE : transmet UNIQUEMENT le code
  // de langue (2 lettres) — jamais le commentaire ni l'URL. Best-effort, silencieux.
  function sendReport(lang) {
    const code = String(lang || "").slice(0, 2).toLowerCase();
    if (BOARD && typeof BOARD.reportFalsePositive === "function") {
      try { BOARD.reportFalsePositive(code); } catch (_) {}
      return;
    }
    try {
      chrome.storage.local.get(EP_KEY, (r) => {
        const ep = String((r && r[EP_KEY]) || DEFAULT_EP).replace(/\/+$/, "");
        fetch(ep + "/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang: code })
        }).catch(() => {});
      });
    } catch (_) { /* contexte sans storage : on ignore */ }
  }

  const STORAGE_KEY = "uwg_state";
  const LISTS_KEY = "uwg_lists"; // Feature #2 : overrides distants en cache (DATA ONLY)
  const DEFAULTS = {
    enabled: true,
    total: 0,
    theme: "nounours",
    intensity: "medium",
    celebrate: true,
    highlightOnly: false,
    remoteLists: false, // opt-in listes en ligne : 100% LOCAL PAR DÉFAUT (OFF)
    sensitivity: "precise" // détection : "precise" (défaut, 0 FP) | "large" (mots durs isolés)
  };

  const PAGE_LANG = (
    document.documentElement.getAttribute("lang") ||
    navigator.language ||
    "en"
  ).slice(0, 2).toLowerCase();

  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT",
    "SELECT", "OPTION", "CODE", "PRE"
  ]);

  function shouldSkip(node) {
    let p = node.parentElement;
    while (p) {
      if (SKIP_TAGS.has(p.tagName)) return true;
      if (p.isContentEditable) return true;
      if (p.classList && p.classList.contains("uwg-soft")) return true;
      p = p.parentElement;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Cœurs persistants + toast (gamification)
  // ---------------------------------------------------------------------------
  // Des cœurs restent visibles, semés autour de CHAQUE endroit filtre.
  const HEARTS = ["💛", "💕", "💖", "💗", "💞", "🩷"];
  function sprinkleHearts(span) {
    const layer = document.createElement("span");
    layer.className = "uwg-hearts";
    layer.setAttribute("aria-hidden", "true");
    const n = 3 + Math.floor(Math.random() * 3); // 3 a 5 cœurs
    for (let i = 0; i < n; i++) {
      const slot = document.createElement("span"); // position
      slot.className = "uwg-heart";
      slot.style.left = (8 + Math.random() * 84).toFixed(0) + "%";
      slot.style.top = (Math.random() * 100).toFixed(0) + "%";

      const inner = document.createElement("span"); // mouvement
      inner.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
      inner.style.fontSize = (11 + Math.random() * 7).toFixed(0) + "px";
      const d = (Math.random() * 1.8).toFixed(2) + "s";
      inner.style.animationDelay = d + ", " + d; // flotte + apparition

      slot.appendChild(inner);
      layer.appendChild(slot);
    }
    span.appendChild(layer);
  }
  function toast(msg) {
    if (!document.body) return;
    const old = document.querySelector(".uwg-toast");
    if (old) old.remove();
    const t = document.createElement("div");
    t.className = "uwg-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------------------------------------------------------------------------
  // Feature #4 — Signalement « pas méchant » (boucle qualité, PRIVÉ)
  // ---------------------------------------------------------------------------
  // Petit drapeau ⚐ discret : invisible au repos, il apparaît au survol du passage
  // adouci. Un clic envoie un signalement et donne un minuscule accusé visuel.
  // VIE PRIVÉE : on ne transmet QUE le code de langue (span.dataset.lang) — jamais
  // le commentaire ni l'URL. Tout est en styles inline (aucune dépendance CSS) et le
  // clic n'altère NI le basculement révéler/cacher, NI les cœurs, NI les badges.
  function addReportFlag(span) {
    const flag = document.createElement("span");
    flag.className = "uwg-report";
    flag.setAttribute("role", "button");
    flag.setAttribute("tabindex", "0");
    flag.setAttribute("aria-label", "Signaler : pas méchant");
    flag.title = "Pas méchant ? Signaler ce faux positif";
    flag.textContent = "⚐";
    // discret : minuscule, atténué, n'apparaît qu'au survol (géré plus bas).
    flag.style.cssText =
      "cursor:pointer;font-size:.8em;margin-left:.25em;opacity:0;" +
      "transition:opacity .15s;vertical-align:super;line-height:1;" +
      "color:#a47b53;user-select:none;";
    const show = () => { if (!flag.dataset.done) flag.style.opacity = ".55"; };
    const hide = () => { if (!flag.dataset.done) flag.style.opacity = "0"; };
    span.addEventListener("mouseenter", show);
    span.addEventListener("mouseleave", hide);
    flag.addEventListener("mouseenter", () => { if (!flag.dataset.done) flag.style.opacity = "1"; });

    function fire(e) {
      e.preventDefault();
      e.stopPropagation(); // ne pas déclencher revealToggle du span parent
      if (flag.dataset.done) return;
      flag.dataset.done = "1";
      sendReport(span.dataset.lang || ""); // best-effort, silencieux, langue SEULE
      // accusé minuscule : le drapeau devient un ✓ vert, figé visible.
      flag.textContent = "✓";
      flag.style.color = "#1f6b4d";
      flag.style.opacity = "1";
      flag.style.cursor = "default";
      flag.title = "Merci, c'est signalé 🙏";
      flag.setAttribute("aria-label", "Signalé : merci");
    }
    flag.addEventListener("click", fire);
    flag.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") fire(e);
    });
    span.appendChild(flag);
  }

  // ---------------------------------------------------------------------------
  // Remplacement
  // ---------------------------------------------------------------------------
  let pending = 0;
  const pendingLangs = new Set(); // langues croisées (badges)
  const pendingLangCounts = {}; // compteur par langue (stats popup, 100 % local)
  let pendingLegendary = 0; // Nounours Légendaires vus (badges)
  let booted = false; // confettis seulement sur les ajouts EN DIRECT, pas au boot

  function revealToggle(e) {
    const el = e.currentTarget;
    const m = el.querySelector(".uwg-msg");
    if (!m) return;
    if (el.classList.contains("revealed")) {
      // "revealed" = on montre le texte d'origine ; on bascule vers le nounours
      el.classList.remove("revealed");
      m.textContent = el.dataset.teddy;
      m.classList.remove("uwg-flag");
    } else {
      el.classList.add("revealed");
      m.textContent = el.dataset.original;
      // flag = mode surlignage (texte d'origine atténué + souligné)
      if (el.dataset.highlight === "1") m.classList.add("uwg-flag");
    }
    e.preventDefault();
    e.stopPropagation();
  }

  // Remplace un nœud texte par une mascotte (chemin liste de mots).
  // Renvoie true si le remplacement a eu lieu (nœud encore en place + non déjà traité).
  function applyMascot(node, text, lang) {
    // garde : le nœud doit être encore dans le DOM et pas déjà remplacé par nous.
    if (!node || !node.parentNode) return false;
    const legendary = CORE.isLegendary(text);
    const msg = CORE.reply({
      theme: state.theme,
      intensity: state.intensity,
      lang,
      seed: text,
      legendary
    });
    const highlight = !!state.highlightOnly;

    const span = document.createElement("span");
    span.className = legendary ? "uwg-soft uwg-legendary" : "uwg-soft";
    // En mode surlignage : on garde le texte d'origine visible (état "revealed").
    if (highlight) span.classList.add("revealed");
    span.title = CORE.HINT[lang] || CORE.HINT.en;
    span.dataset.original = text;
    span.dataset.teddy = msg;
    span.dataset.lang = lang;
    span.dataset.highlight = highlight ? "1" : "0";
    span.addEventListener("click", revealToggle);

    const inner = document.createElement("span");
    inner.className = highlight ? "uwg-msg uwg-flag" : "uwg-msg";
    // surlignage : on montre l'ORIGINAL ; sinon : le message nounours.
    inner.textContent = highlight ? text : msg;
    span.appendChild(inner);

    node.parentNode.replaceChild(span, node);
    pending++;
    pendingLangs.add(lang);
    pendingLangCounts[lang] = (pendingLangCounts[lang] || 0) + 1;
    if (legendary) pendingLegendary++;
    // Cœurs sur TOUT endroit filtre — mais pas en mode surlignage (on n'altère rien).
    if (state.celebrate && !highlight) sprinkleHearts(span);
    // Affordance « pas méchant » (faux positif) — discrète, sur tout passage adouci.
    addReportFlag(span);
    return true;
  }

  function processTextNode(node) {
    const text = node.nodeValue;
    if (!text || text.trim().length < 2) return;
    const lang = CORE.detect(text, PAGE_LANG, { aggressive: state.sensitivity === "large" });
    if (!lang) return;
    if (shouldSkip(node)) return;
    applyMascot(node, text, lang); // le chemin liste flushe via walk()/observer (inchangé)
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = tw.nextNode())) nodes.push(n);
    for (const node of nodes) processTextNode(node);
  }

  function flushCount() {
    if (!pending) return;
    const delta = pending;
    pending = 0;
    const langsDelta = [...pendingLangs]; pendingLangs.clear();
    const langCountsDelta = Object.assign({}, pendingLangCounts);
    for (const k of Object.keys(pendingLangCounts)) delete pendingLangCounts[k];
    const legDelta = pendingLegendary; pendingLegendary = 0;
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      const st = Object.assign({}, DEFAULTS, res[STORAGE_KEY]);
      const before = st.total || 0;
      const after = before + delta;
      st.total = after;
      // badges : langues croisées + Nounours Légendaires vus
      const langs = new Set(st.langs || []);
      langsDelta.forEach((l) => langs.add(l));
      st.langs = [...langs];
      st.langCounts = CORE.bumpLangCounts(st.langCounts, langCountsDelta);
      st.legendary = (st.legendary || 0) + legDelta;
      // série quotidienne (jour UTC) — +1 si jours consécutifs
      st.streak = CORE.updateStreak(st.streak, new Date().toISOString().slice(0, 10));
      chrome.storage.local.set({ [STORAGE_KEY]: st });
      const lvlBefore = CORE.levelFor(before).title;
      const lvlAfter = CORE.levelFor(after).title;
      if (booted && lvlBefore !== lvlAfter) {
        toast("🎉 Niveau atteint : " + lvlAfter + " !");
      }
    });
    try {
      chrome.runtime.sendMessage({ type: "uwg_count", delta });
    } catch (_) { /* service worker endormi */ }
  }

  // ---------------------------------------------------------------------------
  // Boot + observation du flux dynamique
  // ---------------------------------------------------------------------------
  const state = Object.assign({}, DEFAULTS);
  let observer = null;
  let debounceTimer = null;

  function scheduleFlush() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushCount, 250);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((muts) => {
      if (!state.enabled) return;
      for (const m of muts) {
        for (const added of m.addedNodes) walk(added);
      }
      scheduleFlush();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Feature #2 — fusionne les overrides distants en cache (DATA ONLY) AVANT de
  // traiter la page. N'a d'effet QUE si l'opt-in est ON (remoteLists). Ne lance
  // jamais d'exception (le noyau valide déjà ; on protège quand même).
  function applyCachedLists(lists) {
    if (!state.remoteLists) return; // opt-in OFF : on ignore tout cache éventuel
    if (!lists || typeof lists !== "object") return;
    try {
      if (typeof CORE.applyOverrides === "function") CORE.applyOverrides(lists);
    } catch (_) { /* fail-safe : on garde les listes intégrées */ }
  }

  function run() {
    walk(document.body);
    flushCount();
    booted = true; // a partir d'ici, les ajouts sont "en direct"
    startObserver();
  }

  chrome.storage.local.get([STORAGE_KEY, LISTS_KEY], (res) => {
    Object.assign(state, DEFAULTS, res[STORAGE_KEY]);
    applyCachedLists(res[LISTS_KEY]); // overrides en cache (no-op si opt-in OFF)
    if (state.enabled) run();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[STORAGE_KEY]) return;
    const next = Object.assign({}, DEFAULTS, changes[STORAGE_KEY].newValue);
    const wasEnabled = state.enabled;
    Object.assign(state, next);
    if (state.enabled && !wasEnabled) run();
  });
})();
