// DOM minimal pour tester mirror.js / content.js sous Node — zéro dépendance npm.
// Couvre uniquement ce dont les scripts extension ont besoin (pas un navigateur complet).

export const NODE = { ELEMENT: 1, TEXT: 3 };
export const NodeFilter = { SHOW_TEXT: 4 };

let _id = 0;

class ClassList {
  constructor(el) { this._el = el; this._set = new Set(); }
  add(...c) { c.forEach((x) => this._set.add(x)); }
  remove(...c) { c.forEach((x) => this._set.delete(x)); }
  contains(c) { return this._set.has(c); }
  toggle(c) { this.contains(c) ? this.remove(c) : this.add(c); }
}

class Event {
  constructor(type, opts = {}) {
    this.type = type;
    this.bubbles = !!opts.bubbles;
    this.cancelable = !!opts.cancelable;
    this.defaultPrevented = false;
    this.propagationStopped = false;
    this.target = opts.target || null;
    this._currentTarget = null;
    this.key = opts.key || "";
    this.shiftKey = !!opts.shiftKey;
    this.isComposing = !!opts.isComposing;
  }
  get currentTarget() { return this._currentTarget; }
  set currentTarget(v) { this._currentTarget = v; }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.propagationStopped = true; }
}

class DomNode {
  constructor(nodeType) {
    this.nodeType = nodeType;
    this.parentNode = null;
    this.parentElement = null;
  }
}

class TextNode extends DomNode {
  constructor(value) {
    super(NODE.TEXT);
    this.nodeValue = value;
  }
}

class Element extends DomNode {
  constructor(tag) {
    super(NODE.ELEMENT);
    this.tagName = String(tag || "div").toUpperCase();
    this.localName = String(tag || "div").toLowerCase();
    this.children = [];
    this.childNodes = this.children;
    this.classList = new ClassList(this);
    this.dataset = {};
    this.attributes = {};
    this.style = {};
    this._listeners = [];
    this.id = "el" + (++_id);
    this.isContentEditable = false;
    this.type = "text";
    this.value = "";
    this.innerHTML = "";
    this.title = "";
    this._text = "";
  }

  get className() { return [...this.classList._set].join(" "); }
  set className(v) {
    this.classList._set.clear();
    String(v || "").split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c));
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }

  get textContent() {
    if (this.tagName === "TEXTAREA" || this.tagName === "INPUT") return this.value;
    return this.children.map((c) =>
      c.nodeType === NODE.TEXT ? c.nodeValue : (c.textContent || "")
    ).join("");
  }

  set textContent(v) {
    if (this.tagName === "TEXTAREA" || this.tagName === "INPUT") {
      this.value = String(v);
      return;
    }
    this.children = [new TextNode(String(v))];
    this.children[0].parentNode = this;
    this.children[0].parentElement = this;
  }

  appendChild(child) {
    if (!child) return child;
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child);
    child.parentNode = this;
    child.parentElement = this;
    return child;
  }

  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) {
      this.children.splice(i, 1);
      child.parentNode = null;
      child.parentElement = null;
    }
    return child;
  }

  replaceChild(newNode, oldNode) {
    const i = this.children.indexOf(oldNode);
    if (i >= 0) {
      this.children[i] = newNode;
      newNode.parentNode = this;
      newNode.parentElement = this;
      oldNode.parentNode = null;
      oldNode.parentElement = null;
    }
    return oldNode;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  querySelector(sel) {
    if (sel.startsWith("#")) {
      if (this.id === sel.slice(1)) return this;
      const hit = this.querySelectorAll("*").find((e) => e.id === sel.slice(1));
      return hit || null;
    }
    if (sel.startsWith(".")) {
      const cls = sel.slice(1);
      if (this.classList.contains(cls)) return this;
      const hit = this.querySelectorAll("*").find((e) => e.classList.contains(cls));
      return hit || null;
    }
    const tag = sel.toUpperCase();
    const hit = this.querySelectorAll(tag).find((e) => e.tagName === tag);
    return hit || null;
  }

  querySelectorAll(sel) {
    const out = [];
    const wantClass = sel.startsWith(".") ? sel.slice(1) : null;
    const wantTag = (!wantClass && !sel.startsWith("#")) ? sel.toUpperCase() : null;
    const walk = (n) => {
      if (n.nodeType === NODE.ELEMENT) {
        if (wantClass && n.classList.contains(wantClass)) out.push(n);
        else if (wantTag && n.tagName === wantTag) out.push(n);
        else if (sel === "*") out.push(n);
        n.children.forEach(walk);
      }
    };
    walk(this);
    return out;
  }

  contains(other) {
    if (other === this) return true;
    let p = other;
    while (p) {
      if (p === this) return true;
      p = p.parentNode;
    }
    return false;
  }

  getBoundingClientRect() {
    return { top: 100, left: 40, width: 220, height: 28, right: 260, bottom: 128 };
  }

  get offsetHeight() { return 110; }
  get offsetWidth() { return 260; }

  focus() { this._focused = true; }

  addEventListener(type, fn, capture) {
    this._listeners.push({ type, fn, capture: !!capture });
  }

  dispatchEvent(ev) {
    ev._currentTarget = this;
    if (!ev.target) ev.target = this;
    const list = this._listeners.filter((l) => l.type === ev.type);
    for (const l of list) {
      if (ev.propagationStopped) break;
      l.fn(ev);
    }
    return !ev.defaultPrevented;
  }

  set innerHTML(html) {
    this._innerHtmlRaw = html;
    this._parseSimpleHtml(html);
  }

  get innerHTML() { return this._innerHtmlRaw || ""; }

  _parseSimpleHtml(html) {
    this._innerHtmlRaw = html;
    this.children = [];
    // Parser volontairement minimal : blocs miroir + boutons.
    const divRe = /<div class="([^"]+)">([\s\S]*?)<\/div>/g;
    const btnRe = /<button class="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g;
    let m;
    while ((m = divRe.exec(html))) {
      const el = new Element("div");
      el.classList.add(m[1]);
      el.textContent = m[2].replace(/<[^>]+>/g, "").trim();
      this.appendChild(el);
    }
    while ((m = btnRe.exec(html))) {
      const el = new Element("button");
      el.classList.add(m[1]);
      el.textContent = m[2].trim();
      this.appendChild(el);
    }
  }
}

function collectTextNodes(root, out) {
  if (!root) return;
  if (root.nodeType === NODE.TEXT) { out.push(root); return; }
  if (root.nodeType === NODE.ELEMENT) root.children.forEach((c) => collectTextNodes(c, out));
}

function createTreeWalker(root) {
  const nodes = [];
  collectTextNodes(root, nodes);
  let i = 0;
  return { nextNode() { return i < nodes.length ? nodes[i++] : null; } };
}

export function createDom(initial = {}) {
  _id = 0;
  const store = Object.assign({}, initial.store || {});
  const fetchCalls = [];

  const html = new Element("html");
  html.setAttribute = (k, v) => { html.attributes[k] = v; };
  html.getAttribute = (k) => html.attributes[k];
  html.setAttribute("lang", initial.lang || "fr");

  const body = new Element("body");
  html.appendChild(body);

  const document = {
    documentElement: html,
    body,
    createElement(tag) { return new Element(tag); },
    createTextNode(text) { return new TextNode(text); },
    createTreeWalker(root) { return createTreeWalker(root); },
    querySelector(sel) { return body.querySelector(sel) || html.querySelector(sel); },
    querySelectorAll(sel) { return body.querySelectorAll(sel); },
    addEventListener(type, fn, capture) { document._listeners.push({ type, fn, capture: !!capture }); },
    _listeners: [],
    dispatchEvent(ev) {
      const list = document._listeners.filter((l) => l.type === ev.type);
      for (const l of list) {
        if (ev.propagationStopped) break;
        ev._currentTarget = document;
        l.fn(ev);
      }
    },
  };

  const window = {
    innerWidth: 1024,
    addEventListener() {},
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };

  const chrome = {
    storage: {
      local: {
        get(keys, cb) {
          const out = {};
          const list = Array.isArray(keys) ? keys : [keys];
          for (const k of list) {
            if (store[k] !== undefined) out[k] = store[k];
          }
          cb(out);
        },
        set(obj, cb) {
          Object.assign(store, obj);
          cb && cb();
        },
      },
      onChanged: { addListener() {} },
    },
    runtime: {
      sendMessage(_msg, cb) { cb && cb({}); },
      lastError: null,
    },
  };

  const navigator = { language: initial.navLang || "fr-FR" };

  const fetch = (...args) => {
    fetchCalls.push(args);
    return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
  };

  return {
    document, window, navigator, chrome, fetch, store, fetchCalls,
    Event,
    fireKeydown(target, opts = {}) {
      const ev = new Event("keydown", opts);
      ev.key = opts.key || "Enter";
      ev.shiftKey = !!opts.shiftKey;
      ev.target = target;
      document._listeners
        .filter((l) => l.type === "keydown")
        .forEach((l) => { ev._currentTarget = document; l.fn(ev); });
      return ev;
    },
    fireSubmit(form, textarea) {
      const ev = new Event("submit", { cancelable: true });
      ev.target = form;
      document._listeners
        .filter((l) => l.type === "submit")
        .forEach((l) => l.fn(ev));
      return ev;
    },
    fireInput(target) {
      const ev = new Event("input");
      ev.target = target;
      document._listeners
        .filter((l) => l.type === "input")
        .forEach((l) => l.fn(ev));
    },
    fireClick(el) {
      const ev = new Event("click", { target: el });
      el.dispatchEvent(ev);
    },
  };
}

export function runScript(code, ctx) {
  const keys = Object.keys(ctx);
  const vals = keys.map((k) => ctx[k]);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...keys, code);
  fn(...vals);
}