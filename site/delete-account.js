// Suppression autonome du classement depuis privacy.html (code DEL1 temporaire).
(() => {
  "use strict";

  const b64d = (b) => {
    const bin = atob(b.replace(/\s+/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  };

  function t(key) {
    const lang = window.PRIVACY_LANG || document.documentElement.lang || "fr";
    const D = window.PRIVACY_I18N || {};
    return (D[lang] && D[lang][key]) || (D.fr && D.fr[key]) || key;
  }

  function parseDeletionCode(code) {
    let c = String(code || "").trim();
    if (c.startsWith("DEL1:")) c = c.slice(5);
    c = c.replace(/\s+/g, "");
    let data;
    try { data = JSON.parse(b64d(c)); } catch (_) { throw new Error(t("del_invalid")); }
    if (!data || !data.uid || !data.exp || !data.sig) throw new Error(t("del_invalid"));
    return { uid: String(data.uid).slice(0, 64), exp: data.exp, sig: String(data.sig).slice(0, 128) };
  }

  async function submitDeletion(code) {
    const body = parseDeletionCode(code);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ("Erreur " + res.status));
    return data;
  }

  const form = document.getElementById("delForm");
  if (!form) return;

  const input = document.getElementById("delCode");
  const confirm = document.getElementById("delConfirm");
  const msg = document.getElementById("delStatus");
  const btn = document.getElementById("delSubmit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "";
    if (!confirm.checked) {
      msg.textContent = t("del_confirm_err");
      msg.className = "err";
      return;
    }
    btn.disabled = true;
    msg.textContent = t("del_progress");
    try {
      const res = await submitDeletion(input.value);
      msg.textContent = res.removed ? t("del_ok_removed") : t("del_ok_none");
      msg.className = "ok";
      input.value = "";
      confirm.checked = false;
    } catch (err) {
      msg.textContent = String(err.message || err);
      msg.className = "err";
    } finally {
      btn.disabled = false;
    }
  });
})();