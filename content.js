// Un web de gentil — content script
// Utilise le noyau (uwg-core.js, charge avant). Detecte les textes mechants et
// les remplace selon le THEME + l'INTENSITE choisis, avec confettis + niveaux.
(() => {
  "use strict";

  const CORE = (typeof window !== "undefined" && window.UWGCore) || globalThis.UWGCore;
  if (!CORE) return; // noyau absent : on ne casse rien

  const STORAGE_KEY = "uwg_state";
  const DEFAULTS = {
    enabled: true,
    total: 0,
    theme: "nounours",
    intensity: "medium",
    celebrate: true
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
  // Remplacement
  // ---------------------------------------------------------------------------
  let pending = 0;
  let booted = false; // confettis seulement sur les ajouts EN DIRECT, pas au boot

  function revealToggle(e) {
    const el = e.currentTarget;
    const m = el.querySelector(".uwg-msg");
    if (!m) return;
    if (el.classList.contains("revealed")) {
      el.classList.remove("revealed");
      m.textContent = el.dataset.teddy;
    } else {
      el.classList.add("revealed");
      m.textContent = el.dataset.original;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  function processTextNode(node) {
    const text = node.nodeValue;
    if (!text || text.trim().length < 2) return;
    const lang = CORE.detect(text, PAGE_LANG);
    if (!lang) return;
    if (shouldSkip(node)) return;

    const msg = CORE.reply({
      theme: state.theme,
      intensity: state.intensity,
      lang,
      seed: text
    });
    const span = document.createElement("span");
    span.className = "uwg-soft";
    span.title = CORE.HINT[lang] || CORE.HINT.en;
    span.dataset.original = text;
    span.dataset.teddy = msg;
    span.dataset.lang = lang;
    span.addEventListener("click", revealToggle);

    const inner = document.createElement("span");
    inner.className = "uwg-msg";
    inner.textContent = msg;
    span.appendChild(inner);

    node.parentNode.replaceChild(span, node);
    pending++;
    // Cœurs sur TOUT endroit filtre (chargement initial ET ajouts en direct).
    if (state.celebrate) sprinkleHearts(span);
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
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      const st = Object.assign({}, DEFAULTS, res[STORAGE_KEY]);
      const before = st.total || 0;
      const after = before + delta;
      st.total = after;
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

  function run() {
    walk(document.body);
    flushCount();
    booted = true; // a partir d'ici, les ajouts sont "en direct"
    startObserver();
  }

  chrome.storage.local.get(STORAGE_KEY, (res) => {
    Object.assign(state, DEFAULTS, res[STORAGE_KEY]);
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
