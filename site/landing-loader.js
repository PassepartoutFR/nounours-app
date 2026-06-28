// Charge une variante landing en arrière-plan — l'URL reste nounours.app/
(function () {
  "use strict";

  function pick() { return String(1 + Math.floor(Math.random() * 10)); }
  function pad(n) { n = String(n); return n.length < 2 ? "0" + n : n; }

  var q = new URLSearchParams(location.search);
  var force = q.get("v");
  var n = force && /^\d{1,2}$/.test(force)
    ? String(Math.max(1, Math.min(10, +force)))
    : pick();

  var ASSET_V = "20260628a";

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src + (src.indexOf("?") >= 0 ? "&" : "?") + "v=" + ASSET_V;
      s.async = false;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  function cleanUrl() {
    var rest = location.search.replace(/[?&]v=\d{1,2}/g, "").replace(/^\?&/, "?").replace(/\?$/, "");
    history.replaceState(null, "", "/" + rest + location.hash);
  }

  function applyHead(doc) {
    document.title = doc.title;
    var srcDesc = doc.querySelector('meta[name="description"]');
    var dstDesc = document.querySelector('meta[name="description"]');
    if (srcDesc && dstDesc) dstDesc.content = srcDesc.content;

    document.querySelectorAll("link[data-v-inject]").forEach(function (el) { el.remove(); });

    doc.querySelectorAll("head link").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (!href || href.indexOf("landing-base") >= 0) return;
      var exists = Array.from(document.querySelectorAll("link[href]")).some(function (l) {
        return l.getAttribute("href") === href;
      });
      if (exists) return;
      var l = document.createElement("link");
      l.rel = link.rel || "stylesheet";
      if (href) l.href = href;
      if (link.crossOrigin) l.crossOrigin = link.crossOrigin;
      l.setAttribute("data-v-inject", "1");
      document.head.appendChild(l);
    });

    ["lang", "data-theme", "data-variant", "data-variant-slug"].forEach(function (attr) {
      var val = doc.documentElement.getAttribute(attr);
      if (val != null) document.documentElement.setAttribute(attr, val);
    });
  }

  fetch("/variants/v" + pad(n) + ".html", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("variant fetch failed"); return r.text(); })
    .then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      applyHead(doc);
      var body = doc.body.cloneNode(true);
      body.querySelectorAll("script").forEach(function (s) { s.remove(); });
      document.body.className = body.className;
      document.body.innerHTML = body.innerHTML;
      cleanUrl();
      return loadScript("/uwg-core.js")
        .then(function () { return loadScript("/i18n.js"); })
        .then(function () { return loadScript("/stats.js"); })
        .then(function () { return loadScript("/landing.js"); });
    })
    .catch(function () {
      document.body.className = "";
      document.body.innerHTML =
        "<p style='text-align:center;padding:48px 22px;font-family:system-ui,sans-serif'>" +
        "🧸 Impossible de charger la page. <a href='/'>Réessayer</a></p>";
    });
})();