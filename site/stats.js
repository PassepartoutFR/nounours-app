// nounours.app — Tableau des gentils : présence en direct + stats agrégées.
// RESPECT VIE PRIVÉE : identifiant de SESSION éphémère (sessionStorage, jamais
// persisté d'une session à l'autre), ZÉRO cookie, aucune donnée personnelle.
(function (global) {
  "use strict";

  function formatCount(n, lang) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    try { return n.toLocaleString(lang || "fr"); } catch (_) { return String(n); }
  }

  function countupValue(to, progress) {
    to = Math.max(0, Math.floor(Number(to) || 0));
    var p = Math.min(1, Math.max(0, Number(progress) || 0));
    return Math.round(to * (1 - Math.pow(1 - p, 3)));
  }

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

  API.mount = function (opts) {
    if (typeof document === "undefined") return null;
    opts = opts || {};
    var base = opts.api || "/api";
    var getLang = opts.getLang || function () { return "fr"; };
    var store = global.sessionStorage || { getItem: function () {}, setItem: function () {} };
    var sid = sessionId(store);

    var VARIANT_NAMES = {
      "01": "Classic", "02": "Minimal", "03": "Retro", "04": "Magazine", "05": "Playful",
      "06": "Terminal", "07": "Glass", "08": "Brutalist", "09": "Story", "10": "Compact",
    };

    function outreachEls() {
      return {
        ghStars: document.getElementById("statGithubStars"),
        ghClicks: document.getElementById("statGithubClicks"),
        relClicks: document.getElementById("statReleasesClicks"),
        variantBars: document.getElementById("variantBars"),
        variantBarsList: document.getElementById("variantBarsList"),
      };
    }

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

    function sendEvent(payload) {
      var url = base + "/event";
      var body = JSON.stringify(payload);
      try {
        if (global.navigator && global.navigator.sendBeacon) {
          if (global.navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))) return;
        }
      } catch (_) {}
      try {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true,
        }).catch(function () {});
      } catch (_) {}
    }

    function outboundTarget(href, explicit) {
      if (explicit === "releases" || explicit === "github") return explicit;
      href = String(href || "").toLowerCase();
      if (href.indexOf("github.com/passepartoutfr/nounours-app") < 0) return null;
      return href.indexOf("releases") >= 0 ? "releases" : "github";
    }

    function bumpOutbound(target) {
      var o = outreachEls();
      var el = target === "releases" ? o.relClicks : o.ghClicks;
      if (!el) return;
      var n = Number(el.getAttribute("data-val") || 0) + 1;
      el.setAttribute("data-val", String(n));
      el.textContent = formatCount(n, getLang());
    }

    function trackOutbound() {
      document.addEventListener("click", function (e) {
        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a) return;
        var target = outboundTarget(a.getAttribute("href"), a.getAttribute("data-uwg-outbound"));
        if (!target) return;
        bumpOutbound(target);
        sendEvent({ type: "outbound", target: target });
        global.setTimeout(function () { fetchStats(); }, 600);
      }, true);
    }

    function trackVariant() {
      var id = document.documentElement.getAttribute("data-variant");
      if (!id) return;
      sendEvent({ type: "variant", id: id, sid: sid });
    }

    function paintStat(el, n) {
      if (!el) return;
      n = Math.max(0, Math.floor(Number(n) || 0));
      el.setAttribute("data-val", String(n));
      el.textContent = formatCount(n, getLang());
    }

    function paintOutreachDefaults() {
      var o = outreachEls();
      paintStat(o.ghStars, 0);
      paintStat(o.ghClicks, 0);
      paintStat(o.relClicks, 0);
    }

    function renderVariantBars(variants) {
      var o = outreachEls();
      if (!o.variantBars || !o.variantBarsList) return;
      var list = (variants || []).filter(function (v) { return v && v.n > 0; });
      if (!list.length) { o.variantBars.hidden = true; return; }
      var max = list.reduce(function (m, v) { return Math.max(m, v.n); }, 1);
      o.variantBars.hidden = false;
      o.variantBarsList.innerHTML = list.map(function (v) {
        var pct = Math.max(6, Math.round((v.n / max) * 100));
        var slug = VARIANT_NAMES[v.id] || ("v" + v.id);
        return '<div class="variant-row">' +
          '<span class="vtag">v' + v.id + " · " + slug + "</span>" +
          '<span class="bar-track"><i class="bar-fill" data-w="' + pct + '"></i></span>' +
          '<span class="vnum">' + formatCount(v.n, getLang()) + "</span></div>";
      }).join("");
      global.requestAnimationFrame(function () {
        o.variantBarsList.querySelectorAll(".bar-fill").forEach(function (b) {
          b.style.width = (b.getAttribute("data-w") || 0) + "%";
        });
      });
    }

    function applyOutreach(s) {
      if (!s || typeof s !== "object") return;
      var o = outreachEls();
      paintStat(o.ghStars, s.github_stars);
      paintStat(o.ghClicks, s.github_clicks);
      paintStat(o.relClicks, s.releases_clicks);
      renderVariantBars(s.variants);
    }

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
      applyOutreach(s);
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

    paintOutreachDefaults();
    trackOutbound();
    trackVariant();
    beat();
    fetchStats();
    global.setInterval(beat, 25000);
    global.setInterval(fetchStats, 15000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { beat(); fetchStats(); }
    });

    API._refreshLabels = function () {
      ["accounts", "transformed", "today", "total", "live"].forEach(function (k) {
        var el = els[k];
        if (el) el.textContent = formatCount(Number(el.getAttribute("data-val") || 0), getLang());
      });
      var o = outreachEls();
      paintStat(o.ghStars, Number(o.ghStars && o.ghStars.getAttribute("data-val")));
      paintStat(o.ghClicks, Number(o.ghClicks && o.ghClicks.getAttribute("data-val")));
      paintStat(o.relClicks, Number(o.relClicks && o.relClicks.getAttribute("data-val")));
    };

    return { fetchStats: fetchStats, beat: beat };
  };

  API.refreshLabels = function () { if (API._refreshLabels) API._refreshLabels(); };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  global.UWGStats = API;
})(typeof window !== "undefined" ? window : globalThis);