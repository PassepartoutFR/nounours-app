// Tests mirror.js + content.js via DOM minimal (test/dom-lite.mjs) — zéro npm.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createDom, runScript, NODE, NodeFilter } from "./dom-lite.mjs";

class MutationObserverStub {
  constructor(cb) { this._cb = cb; }
  observe() {}
  disconnect() {}
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const mirrorSrc = readFileSync(join(ROOT, "mirror.js"), "utf8");
const contentSrc = readFileSync(join(ROOT, "content.js"), "utf8");

function bootMirror(dom, core, cfg = {}) {
  dom.store.uwg_state = Object.assign({ mirror: true, theme: "nounours" }, cfg);
  const w = Object.assign(dom.window, { UWGCore: core, document: dom.document });
  runScript(mirrorSrc, {
    window: w,
    document: dom.document,
    navigator: dom.navigator,
    chrome: dom.chrome,
    Event: dom.Event,
    self: w,
    globalThis: w,
  });
}

function bootContent(dom, core, cfg = {}) {
  dom.store.uwg_state = Object.assign({
    enabled: true,
    total: 0,
    theme: "nounours",
    intensity: "medium",
    celebrate: false,
    highlightOnly: false,
    remoteLists: false,
    sensitivity: "precise",
    aiMode: false,
  }, cfg);
  const w = Object.assign(dom.window, { UWGCore: core, document: dom.document });
  runScript(contentSrc, {
    window: w,
    document: dom.document,
    navigator: dom.navigator,
    chrome: dom.chrome,
    fetch: dom.fetch,
    Event: dom.Event,
    Node: { TEXT_NODE: NODE.TEXT, ELEMENT_NODE: NODE.ELEMENT },
    NodeFilter,
    MutationObserver: MutationObserverStub,
    setTimeout: dom.window.setTimeout,
    clearTimeout: dom.window.clearTimeout,
    self: w,
    globalThis: w,
  });
}

function textInBody(dom, text) {
  const p = dom.document.createElement("p");
  p.appendChild(dom.document.createTextNode(text));
  dom.document.body.appendChild(p);
}

export async function runMirrorContentTests(ok, core) {
  // ---- mirror.js : intercepte Enter sur texte méchant ----
  {
    const dom = createDom({ lang: "fr" });
    const ta = dom.document.createElement("textarea");
    ta.value = "tu es vraiment un idiot";
    dom.document.body.appendChild(ta);
    bootMirror(dom, core);
    const ev = dom.fireKeydown(ta, { key: "Enter" });
    ok(ev.defaultPrevented, "mirror : Enter sur insulte FR -> intercepté");
    ok(!!dom.document.querySelector(".uwg-mirror"), "mirror : bulle affichée");
  }

  // ---- mirror.js : Adoucir remplace le brouillon ----
  {
    const dom = createDom({ lang: "fr" });
    const ta = dom.document.createElement("textarea");
    ta.value = "espèce de connard";
    dom.document.body.appendChild(ta);
    bootMirror(dom, core);
    dom.fireKeydown(ta, { key: "Enter" });
    const softBtn = dom.document.querySelector(".uwg-mirror-soft");
    ok(!!softBtn, "mirror : bouton Adoucir présent");
    dom.fireClick(softBtn);
    ok(ta.value.startsWith("🧸") || ta.value.startsWith("💛"), "mirror : Adoucir injecte une réplique douce");
    ok(!dom.document.querySelector(".uwg-mirror"), "mirror : bulle fermée après Adoucir");
  }

  // ---- mirror.js : Envoyer quand même + re-edit réactive le miroir ----
  {
    const dom = createDom({ lang: "fr" });
    const ta = dom.document.createElement("textarea");
    const mean = "tu es un connard";
    ta.value = mean;
    dom.document.body.appendChild(ta);
    bootMirror(dom, core);
    dom.fireKeydown(ta, { key: "Enter" });
    const keepBtn = dom.document.querySelector(".uwg-mirror-keep");
    ok(!!keepBtn, "mirror : bouton Envoyer quand même présent");
    dom.fireClick(keepBtn);
    const ev2 = dom.fireKeydown(ta, { key: "Enter" });
    ok(!ev2.defaultPrevented, "mirror : après Envoyer quand même, Enter passe");
    ta.value = mean + " !!!";
    dom.fireInput(ta);
    const ev3 = dom.fireKeydown(ta, { key: "Enter" });
    ok(ev3.defaultPrevented, "mirror : re-modification -> miroir réactivé");
  }

  // ---- mirror.js : désactivé si mirror=false ----
  {
    const dom = createDom({ lang: "fr" });
    const ta = dom.document.createElement("textarea");
    ta.value = "idiot de merde";
    dom.document.body.appendChild(ta);
    bootMirror(dom, core, { mirror: false });
    const ev = dom.fireKeydown(ta, { key: "Enter" });
    ok(!ev.defaultPrevented, "mirror : OFF -> pas d'intercept");
    ok(!dom.document.querySelector(".uwg-mirror"), "mirror : OFF -> pas de bulle");
  }

  // ---- content.js : remplace un commentaire méchant ----
  {
    const dom = createDom({ lang: "fr" });
    textInBody(dom, "quel connard ce type");
    bootContent(dom, core);
    const soft = dom.document.querySelector(".uwg-soft");
    ok(!!soft, "content : texte méchant -> span uwg-soft");
    ok(soft.querySelector(".uwg-msg"), "content : message mascotte présent");
    ok((dom.store.uwg_state.total || 0) >= 1, "content : compteur total incrémenté");
    ok((dom.store.uwg_state.langCounts && dom.store.uwg_state.langCounts.fr) >= 1,
      "content : langCounts.fr incrémenté");
  }

  // ---- content.js : laisse un texte gentil intact ----
  {
    const dom = createDom({ lang: "fr" });
    textInBody(dom, "Belle journée, bravo à tous !");
    bootContent(dom, core);
    ok(!dom.document.querySelector(".uwg-soft"), "content : texte gentil -> inchangé");
    ok((dom.store.uwg_state.total || 0) === 0, "content : gentil -> total 0");
  }

  // ---- content.js : clic révèle l'original ----
  {
    const dom = createDom({ lang: "fr" });
    const mean = "quel connard ce type";
    textInBody(dom, mean);
    bootContent(dom, core);
    const soft = dom.document.querySelector(".uwg-soft");
    const msg = soft.querySelector(".uwg-msg");
    ok(msg.textContent !== mean, "content : avant clic, mascotte affichée");
    const ev = new dom.Event("click");
    ev.currentTarget = soft;
    soft._listeners.filter((l) => l.type === "click").forEach((l) => l.fn(ev));
    ok(soft.classList.contains("revealed"), "content : clic -> revealed");
    ok(msg.textContent === mean, "content : clic -> texte original visible");
  }

  // ---- content.js : mode surligner ----
  {
    const dom = createDom({ lang: "fr" });
    textInBody(dom, "tu es un connard");
    bootContent(dom, core, { highlightOnly: true });
    const soft = dom.document.querySelector(".uwg-soft");
    ok(soft.classList.contains("revealed"), "content : surligner -> original visible");
    ok(soft.querySelector(".uwg-msg").classList.contains("uwg-flag"), "content : surligner -> classe uwg-flag");
  }

  // ---- content.js : signalement faux positif (langue seule) ----
  {
    const dom = createDom({ lang: "fr" });
    textInBody(dom, "sale con de ta race");
    bootContent(dom, core);
    const flag = dom.document.querySelector(".uwg-report");
    ok(!!flag, "content : drapeau faux positif présent");
    dom.fireClick(flag);
    ok(flag.dataset.done === "1", "content : signalement marqué done");
    ok(dom.fetchCalls.length >= 1, "content : fetch /report appelé");
    const body = JSON.parse(dom.fetchCalls[0][1].body);
    ok(body.lang === "fr", "content : report n'envoie que le code langue");
    ok(!body.text && !body.url, "content : report sans texte ni URL");
  }

  // ---- content.js : désactivé si enabled=false ----
  {
    const dom = createDom({ lang: "fr" });
    textInBody(dom, "connard");
    bootContent(dom, core, { enabled: false });
    ok(!dom.document.querySelector(".uwg-soft"), "content : enabled OFF -> pas de remplacement");
  }
}