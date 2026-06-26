// nounours.app — Tableau des gentils : présence en direct + stats agrégées.
// RESPECT VIE PRIVÉE : identifiant de SESSION éphémère (sessionStorage, jamais
// persisté d'une session à l'autre), ZÉRO cookie, aucune donnée personnelle.
// Côté serveur : la présence vit en RAM (fenêtre glissante), les compteurs sont
// agrégés. Ce fichier = helpers PURS (testés par test/run.mjs) + un contrôleur
// DOM monté EXPLICITEMENT par la page (rien ne s'exécute à l'import → sûr en test).
(function (global) {
  "use strict";

  // ---------- helpers PURS (zéro DOM, testés sans navigateur) ----------

  // formate un entier selon la langue (séparateurs de milliers locaux)
  function formatCount(n, lang) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    try { return n.toLocaleString(lang || "fr"); } catch (_) { return String(n); }
  }

  // valeur intermédiaire d'un compteur animé 0 → to (ease-out cubic)
  function countupValue(to, progress) {
    to = Math.max(0, Math.floor(Number(to) || 0));
    var p = Math.min(1, Math.max(0, Number(progress) || 0));
    return Math.round(to * (1 - Math.pow(1 - p, 3)));
  }

  // points d'une sparkline SVG (attribut `points` d'un <polyline>) pour valeurs ≥ 0
  function sparkPoints(values, w, h, pad) {
    var arr = (values || []).map(function (v) { return Math.max(0, Number(v) || 0); });
    w = Number(w) || 100; h = Number(h) || 30; pad = pad == null ? 2 : pad;
    if (arr.length === 0) return "";
    if (arr.length === 1) arr = [arr[0], arr[0]];
    var max = Math.max.apply(null, arr); if (max <= 0) max = 1;
    var n = arr.length, iw = w - pad * 2, ih = h - pad * 2;
    return arr.map(function (v, i) {
      var x = pad + (i / (n - 1)) * iw;
      var y = pad + ih - (v / max) * ih;
      return (Math.round(x * 100) / 100) + "," + (Math.round(y * 100) / 100);
    }).join(" ");
  }

  // identifiant de SESSION éphémère : régénéré à chaque nouvel onglet/session,
  // jamais de cookie, jamais de stockage persistant (sessionStorage uniquement).
  function sessionId(storage) {
    var KEY = "uwg_sid";
    try {
      var s = storage.getItem(KEY);
      if (!s) {
        s = "s-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
        storage.setItem(KEY, s);
      }
      return s;
    } catch (_) {
      return "s-" + Math.random().toString(36).slice(2);
    }
  }

  var API = {
    formatCount: formatCount,
    countupValue: countupValue,
    sparkPoints: sparkPoints,
    sessionId: sessionId,
  };

  // ---------- contrôleur DOM (appelé via UWGStats.mount(...)) ----------
  API.mount = function (opts) {
    if (typeof document === "undefined") return null; // sûr en environnement de test
    opts = opts || {};
    var base = opts.api || "/api";
    var getLang = opts.getLang || function () { return "fr"; };
    var store = global.sessionStorage || { getItem: function () {}, setItem: function () {} };
    var sid = sessionId(store);

    var els = {
      live: document.getElementById("statLive"),
      liveWrap: document.getElementById("dashLive"),
      accounts: document.getElementById("statAccounts"),
      transformed: document.getElementById("statTransformed"),
      today: document.getElementById("statToday"),
      total: document.getElementById("statTotal"),
      spark: document.getElementById("statSpark"),
      err: document.getElementById("dashError"),
    };

    function reduceMotion() {
      return global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function animate(el, to) {
      if (!el) return;
      to = Math.max(0, Math.floor(Number(to) || 0));
      var prev = Number(el.getAttribute("data-val") || "0");
      el.setAttribute("data-val", String(to));
      if (prev === to || reduceMotion() || !global.requestAnimationFrame) {
        el.textContent = formatCount(to, getLang());
        return;
      }
      var start = null, dur = 900;
      function frame(ts) {
        if (start == null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        el.textContent = formatCount(countupValue(to, p), getLang());
        if (p < 1) global.requestAnimationFrame(frame);
      }
      global.requestAnimationFrame(frame);
    }

    function paintLive(n) {
      n = Math.max(0, Math.floor(Number(n) || 0));
      if (els.live) { els.live.setAttribute("data-val", String(n)); els.live.textContent = formatCount(n, getLang()); }
      if (els.liveWrap) els.liveWrap.setAttribute("data-empty", n > 0 ? "0" : "1");
    }

    function renderSpark(days) {
      if (!els.spark) return;
      els.spark.setAttribute("points", sparkPoints((days || []).map(function (d) { return d.n; }), 220, 44, 3));
    }

    function applyStats(s) {
      if (!s || typeof s !== "object") return;
      if (els.err) els.err.style.display = "none";
      paintLive(s.live);
      animate(els.accounts, s.accounts);
      animate(els.transformed, s.transformed);
      animate(els.today, s.today);
      animate(els.total, s.total);
      renderSpark(s.days);
    }

    function fetchStats() {
      return fetch(base + "/stats", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(applyStats)
        .catch(function () { if (els.err) els.err.style.display = ""; });
    }

    function beat() {
      try {
        fetch(base + "/beat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sid: sid }),
          keepalive: true,
        })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d && typeof d.live === "number") paintLive(d.live); })
          .catch(function () {});
      } catch (_) {}
    }

    // boucle : battement de présence (≈ fenêtre serveur) + rafraîchissement stats
    beat(); fetchStats();
    global.setInterval(beat, 25000);
    global.setInterval(fetchStats, 15000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { beat(); fetchStats(); }
    });

    // re-localise les nombres déjà affichés quand la langue change
    API._refreshLabels = function () {
      ["accounts", "transformed", "today", "total", "live"].forEach(function (k) {
        var el = els[k];
        if (el) el.textContent = formatCount(Number(el.getAttribute("data-val") || 0), getLang());
      });
    };

    return { fetchStats: fetchStats, beat: beat };
  };

  // no-op tant que mount() n'a pas tourné (appelé par apply() au changement de langue)
  API.refreshLabels = function () { if (API._refreshLabels) API._refreshLabels(); };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  global.UWGStats = API;
})(typeof window !== "undefined" ? window : globalThis);
