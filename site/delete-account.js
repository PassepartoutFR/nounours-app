// Suppression autonome du classement depuis privacy.html (code DEL1 temporaire).
(() => {
  "use strict";

  const b64d = (s) => decodeURIComponent(escape(atob(s)));

  function parseDeletionCode(code) {
    let c = String(code || "").trim();
    if (c.startsWith("DEL1:")) c = c.slice(5);
    let data;
    try { data = JSON.parse(b64d(c)); } catch (_) { throw new Error("Code invalide"); }
    if (!data || !data.uid || !data.exp || !data.sig) throw new Error("Code invalide");
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
      msg.textContent = "Coche la case de confirmation.";
      msg.className = "err";
      return;
    }
    btn.disabled = true;
    msg.textContent = "Suppression en cours…";
    try {
      const res = await submitDeletion(input.value);
      msg.textContent = res.removed
        ? "C'est fait : ton entrée du classement a été supprimée. Le code ne sert plus à rien."
        : "Aucune entrée trouvée pour ce code (déjà supprimée ?).";
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