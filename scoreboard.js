// WebDeGentil — "compte sans compte" + classement (cote client)
// Charge dans le popup ET dans le service worker. Genere une identite anonyme
// (uid + secret) qui vit dans l'extension, et parle au serveur de classement.
// N'envoie JAMAIS de commentaires ni d'URL : uniquement {uid, pseudo, total}.
(() => {
  "use strict";

  const ACC_KEY = "uwg_account";
  const EP_KEY = "uwg_endpoint";
  const DEFAULT_EP = "https://nounours.app/api";

  const get = (keys) => new Promise((r) => chrome.storage.local.get(keys, r));
  const set = (obj) => new Promise((r) => chrome.storage.local.set(obj, r));

  const hex = (buf) =>
    [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  function rand(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return hex(a);
  }
  function hexToBytes(h) {
    const a = new Uint8Array(h.length / 2);
    for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
    return a;
  }
  async function hmac(secretHex, msg) {
    const key = await crypto.subtle.importKey(
      "raw", hexToBytes(secretHex), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
  }

  async function endpoint() {
    const r = await get(EP_KEY);
    return (r[EP_KEY] || DEFAULT_EP).replace(/\/+$/, "");
  }

  // cree l'identite anonyme la 1ere fois (uid + secret + token derive)
  async function ensureAccount() {
    const r = await get(ACC_KEY);
    let acc = r[ACC_KEY];
    if (!acc || !acc.uid || !acc.secret) {
      const uid = rand(8);
      const secret = rand(16);
      const token = await hmac(secret, uid);
      acc = { uid, secret, token, pseudo: "", optedIn: false };
      await set({ [ACC_KEY]: acc });
    } else if (!acc.token) {
      acc.token = await hmac(acc.secret, acc.uid);
      await set({ [ACC_KEY]: acc });
    }
    return acc;
  }

  async function update(partial) {
    const acc = await ensureAccount();
    const next = Object.assign({}, acc, partial);
    await set({ [ACC_KEY]: next });
    return next;
  }

  async function currentTotal() {
    const r = await get("uwg_state");
    return (r.uwg_state && r.uwg_state.total) || 0;
  }

  async function postScore() {
    const acc = await ensureAccount();
    if (!acc.optedIn || !acc.pseudo) return { skipped: true };
    const total = await currentTotal();
    const ep = await endpoint();
    const res = await fetch(ep + "/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: acc.uid, pseudo: acc.pseudo, total, token: acc.token })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  async function fetchLeaderboard(limit) {
    const acc = await ensureAccount();
    const ep = await endpoint();
    const res = await fetch(
      ep + "/leaderboard?limit=" + (limit || 20) + "&uid=" + encodeURIComponent(acc.uid)
    );
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  async function join(pseudo) {
    await update({ pseudo: String(pseudo || "").slice(0, 24), optedIn: true });
    return postScore();
  }
  async function leave() {
    return update({ optedIn: false });
  }

  // --- export / import d'identité (pour ne jamais perdre son score) ---
  // base64 sûr en UTF-8 (pseudo avec accents/emoji OK)
  const b64e = (s) => btoa(unescape(encodeURIComponent(s)));
  const b64d = (s) => decodeURIComponent(escape(atob(s)));

  async function exportAccount() {
    const acc = await ensureAccount();
    return "UWG1:" + b64e(JSON.stringify({ uid: acc.uid, secret: acc.secret, pseudo: acc.pseudo || "" }));
  }
  async function importAccount(code) {
    let c = String(code || "").trim();
    if (c.startsWith("UWG1:")) c = c.slice(5);
    let data;
    try { data = JSON.parse(b64d(c)); } catch (_) { throw new Error("Code invalide"); }
    if (!data || !data.uid || !data.secret) throw new Error("Code invalide");
    const token = await hmac(data.secret, data.uid);
    const acc = { uid: data.uid, secret: data.secret, token, pseudo: data.pseudo || "", optedIn: true };
    await set({ [ACC_KEY]: acc });
    return acc;
  }

  const api = {
    ensureAccount, getAccount: ensureAccount, update,
    postScore, fetchLeaderboard, join, leave, endpoint, DEFAULT_EP,
    exportAccount, importAccount
  };
  if (typeof self !== "undefined") self.UWGBoard = api;
  if (typeof window !== "undefined") window.UWGBoard = api;
  // hook de test Node (aucun effet navigateur : self/window y sont définis)
  if (typeof self === "undefined" && typeof window === "undefined") globalThis.UWGBoard = api;
})();
