// ====== i18n ======
    const SUP = ["fr", "en", "es", "it", "de", "pt", "nl"];
    const LANGNAMES = { fr: "Français", en: "English", es: "Español", it: "Italiano", de: "Deutsch", pt: "Português", nl: "Nederlands" };
    let LANG = (function () {
      const s = localStorage.getItem("uwg_lang");
      if (SUP.includes(s)) return s;
      const n = (navigator.language || "en").slice(0, 2).toLowerCase();
      return SUP.includes(n) ? n : "en";
    })();
    function t(key) { return (window.I18N[LANG] && window.I18N[LANG][key]) || window.I18N.fr[key] || key; }
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    function mk(s) { // markup léger -> html
      return escapeHtml(s).replace(/\n/g, "<br>")
        .replace(/\*([^*]+)\*/g, '<span class="em">$1</span>')
        .replace(/_([^_]+)_/g, "<em>$1</em>");
    }

    // sélecteur de langue
    const langSel = document.getElementById("langSel");
    SUP.forEach((l) => { const o = document.createElement("option"); o.value = l; o.textContent = LANGNAMES[l]; langSel.appendChild(o); });
    langSel.value = LANG;
    langSel.addEventListener("change", () => { LANG = langSel.value; localStorage.setItem("uwg_lang", LANG); apply(); });

    function apply() {
      document.documentElement.lang = LANG;
      document.title = t("meta_title");
      const md = document.querySelector('meta[name="description"]'); if (md) md.content = t("meta_desc");
      document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
      document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = mk(t(el.dataset.i18nHtml)); });
      document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
      // contenus pilotés par JS
      showAfter(baState);
      renderInten();
      loadBoard();
      if (window.UWGStats) UWGStats.refreshLabels();
    }

    // ====== thème sombre ======
    const root = document.documentElement, themeBtn = document.getElementById("themeBtn");
    themeBtn.addEventListener("click", () => {
      const dark = root.getAttribute("data-theme") === "dark";
      root.setAttribute("data-theme", dark ? "light" : "dark");
      themeBtn.textContent = dark ? "🌙" : "☀️";
    });

    // ====== cœurs ======
    const HEARTS = ["💛","💕","💖","💗","💞","🩷"];
    function sprinkle(layer, n) {
      layer.innerHTML = "";
      for (let i = 0; i < (n || 5); i++) {
        const slot = document.createElement("span"); slot.className = "heart";
        slot.style.left = (6 + Math.random()*88) + "%"; slot.style.top = (Math.random()*100) + "%";
        const inner = document.createElement("span");
        inner.textContent = HEARTS[Math.floor(Math.random()*HEARTS.length)];
        inner.style.fontSize = (12 + Math.random()*10) + "px"; inner.style.animationDelay = (Math.random()*1.8) + "s";
        slot.appendChild(inner); layer.appendChild(slot);
      }
    }

    // ====== hero avant/après ======
    const heroMean = document.getElementById("heroMean"), heroHearts = document.getElementById("heroHearts");
    let baState = true;
    function showAfter(after) {
      baState = after;
      document.getElementById("baAfter").classList.toggle("on", after);
      document.getElementById("baBefore").classList.toggle("on", !after);
      if (after) { heroMean.className = "ctext bubble"; heroMean.textContent = t("ba_nice"); sprinkle(heroHearts, 6); }
      else { heroMean.className = "ctext meanbox mean"; heroMean.textContent = t("ba_mean"); heroHearts.innerHTML = ""; }
    }
    let baTouched = false;
    document.getElementById("baAfter").addEventListener("click", () => { baTouched = true; showAfter(true); });
    document.getElementById("baBefore").addEventListener("click", () => { baTouched = true; showAfter(false); });
    setTimeout(() => { if (baTouched) return; showAfter(false); setTimeout(() => { if (!baTouched) showAfter(true); }, 1500); }, 1700);

    // ====== intensité ======
    const range = document.getElementById("intenRange"), reply = document.getElementById("intenReply");
    function renderInten() { reply.textContent = t("inten_" + range.value); }
    range.addEventListener("input", renderInten);

    // ====== essaie (moteur réel) ======
    const CORE = window.UWGCore, tryOut = document.getElementById("tryOut"), tryInput = document.getElementById("tryInput");
    function intensityKey() { return ["doux","medium","hardcore"][Number(range.value)]; }
    function tryIt() {
      const v = tryInput.value.trim(); if (!v) return;
      if (!CORE) { tryOut.innerHTML = "<span class='soft'></span>"; tryOut.querySelector(".soft").textContent = t("try_loading"); return; }
      const lang = CORE.detect(v, LANG);
      if (!lang) { tryOut.innerHTML = "<span class='ok'></span>"; tryOut.querySelector(".ok").textContent = t("try_nice"); return; }
      const msg = CORE.reply({ theme: "nounours", intensity: intensityKey(), lang, seed: v });
      tryOut.innerHTML = "<span class='soft'></span> <small style='color:var(--muted)'>[" + lang + "]</small>";
      tryOut.querySelector(".soft").textContent = msg;
    }
    document.getElementById("tryBtn").addEventListener("click", tryIt);
    tryInput.addEventListener("keydown", (e) => { if (e.key === "Enter") tryIt(); });

    // ====== classement live ======
    async function loadBoard() {
      const list = document.getElementById("lbList");
      try {
        const r = await fetch("/api/leaderboard?limit=6", { cache: "no-store" });
        const data = await r.json();
        if (!data.top || !data.top.length) { list.innerHTML = "<li>" + escapeHtml(t("board_empty")) + "</li>"; return; }
        const medals = ["🥇","🥈","🥉"];
        list.innerHTML = data.top.map((e, i) =>
          `<li>${medals[i] || ""} ${escapeHtml(e.pseudo)} <span>${(e.total).toLocaleString(LANG)}</span></li>`
        ).join("") + `<li style="opacity:.75">${escapeHtml(t("board_you_label"))} <span>${escapeHtml(t("board_you_val"))}</span></li>`;
      } catch (e) { list.innerHTML = "<li style='opacity:.8'>" + escapeHtml(t("board_error")) + "</li>"; }
    }

    // ====== Compteur mondial live (#5) + Météo de la gentillesse (#7) ======
    // Strictement additif : réutilise /api/stats, t(), LANG. Échec réseau = silencieux
    // (le compteur garde sa dernière valeur, la météo reste masquée).
    const KIND = (function () {
      const elCount = document.getElementById("kindCount");
      const elTicker = document.getElementById("kindTicker");
      const wxBox = document.getElementById("kindWeather");
      const wxEmo = document.getElementById("wxEmo"), wxMood = document.getElementById("wxMood");
      const wxPct = document.getElementById("wxPct"), wxBar = document.getElementById("wxBar");
      const POPS = ["💛","💕","🧸","✨","🩷","💖"];
      let current = 0;          // valeur affichée du compteur
      let started = false;      // 1re animation faite ?
      let lastStats = null;     // dernier /api/stats reçu (pour re-render i18n)
      let animTok = 0;          // jeton anti-chevauchement d'animations

      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function milestoneStep(v) { return v >= 5000 ? 1000 : v >= 1000 ? 500 : v >= 200 ? 100 : 50; }

      function burst() {
        if (reduce || !elTicker) return;
        const rect = elTicker.getBoundingClientRect();
        for (let i = 0; i < 14; i++) {
          const s = document.createElement("span");
          s.className = "tk-pop"; s.textContent = POPS[Math.floor(Math.random() * POPS.length)];
          s.style.left = (12 + Math.random() * (rect.width - 24)) + "px";
          s.style.bottom = "14px";
          s.style.setProperty("--r", (Math.random() * 40 - 20) + "deg");
          s.style.animation = "tkpop " + (1.1 + Math.random() * 0.8) + "s ease-out forwards";
          s.style.animationDelay = (Math.random() * 0.25) + "s";
          elTicker.appendChild(s);
          setTimeout(() => s.remove(), 2200);
        }
      }

      function countTo(target) {
        if (typeof target !== "number" || !isFinite(target) || target < 0) return;
        if (reduce) { current = target; elCount.textContent = target.toLocaleString(LANG); return; }
        const from = current, delta = target - from;
        if (delta === 0) { elCount.textContent = target.toLocaleString(LANG); return; }
        const startStep = Math.floor(from / milestoneStep(target));
        const dur = Math.min(1600, 500 + Math.abs(delta) * 4);
        const t0 = performance.now(); const tok = ++animTok;
        (function frame(now) {
          if (tok !== animTok) return;            // une animation plus récente a pris la main
          const p = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);   // easeOutCubic
          const val = Math.round(from + delta * eased);
          elCount.textContent = val.toLocaleString(LANG);
          if (delta > 0 && Math.floor(val / milestoneStep(target)) > startStep) { burst(); }
          if (p < 1) requestAnimationFrame(frame); else { current = target; elCount.textContent = target.toLocaleString(LANG); }
        })(t0);
      }

      // Météo déterministe-par-jour : dérivée de today/total/transformed + la date.
      function weather(st) {
        const today = Number(st.today) || 0, total = Number(st.total) || 0, tr = Number(st.transformed) || 0;
        // base "douceur" : part des visites du jour + bonus log des câlins, borné 55–99.
        const ratio = total > 0 ? today / total : 0;
        const d = new Date();
        const daySeed = (d.getUTCFullYear() * 372 + (d.getUTCMonth() + 1) * 31 + d.getUTCDate()); // stable sur la journée UTC
        const wob = (daySeed * 9301 + 49297) % 233280 / 233280;   // pseudo-aléa déterministe [0,1)
        let pct = 62 + ratio * 120 + Math.log10(1 + tr) * 5 + (wob * 16 - 4);
        pct = Math.max(55, Math.min(99, Math.round(pct)));
        const idx = pct >= 95 ? 4 : pct >= 85 ? 3 : pct >= 75 ? 2 : pct >= 65 ? 1 : 0;
        return { pct, idx };
      }

      function renderWeather() {
        if (!lastStats) return;
        const w = weather(lastStats);
        wxEmo.textContent = t("wx_" + w.idx + "_emo");
        wxMood.textContent = t("wx_" + w.idx + "_label") + " " + t("wx_" + w.idx + "_emo");
        wxPct.textContent = w.pct + " %";
        wxBar.style.width = w.pct + "%";
        wxBox.style.display = "flex";
      }

      async function pull() {
        try {
          const r = await fetch("/api/stats", { cache: "no-store" });
          if (!r.ok) throw new Error("bad status");
          const st = await r.json();
          lastStats = st;
          countTo(Number(st.transformed) || 0);
          started = true;
          renderWeather();
        } catch (e) { /* silencieux : on garde l'état précédent */ }
      }

      function init() {
        pull();
        setInterval(pull, 20000);   // rafraîchissement ~20 s
      }
      // re-traduction de la météo (libellés pilotés JS) au changement de langue.
      function onLang() { if (started) { elCount.textContent = current.toLocaleString(LANG); renderWeather(); } }

      return { init, onLang };
    })();

    // ====== Carte de chaleur de la gentillesse (#6) ======
    // Strictement additif : réutilise /api/geo, t(), LANG, escapeHtml.
    // Données par LANGUE de navigateur (approximatif) — jamais position ni IP.
    // Échec réseau / vide = bloc masqué (aucune erreur console).
    const GEO = (function () {
      const block = document.getElementById("geoBlock");
      const list = document.getElementById("geoList");
      // Code langue (2 lettres) -> drapeau + nom humain. Inconnu/"??" -> 🌍 « Ailleurs ».
      const MAP = {
        fr: ["🇫🇷", "Français"], en: ["🇬🇧", "English"], es: ["🇪🇸", "Español"],
        de: ["🇩🇪", "Deutsch"], it: ["🇮🇹", "Italiano"], pt: ["🇵🇹", "Português"],
        nl: ["🇳🇱", "Nederlands"], pl: ["🇵🇱", "Polski"], ru: ["🇷🇺", "Русский"],
        ja: ["🇯🇵", "日本語"], zh: ["🇨🇳", "中文"], ko: ["🇰🇷", "한국어"],
        ar: ["🇸🇦", "العربية"], tr: ["🇹🇷", "Türkçe"], sv: ["🇸🇪", "Svenska"],
        no: ["🇳🇴", "Norsk"], da: ["🇩🇰", "Dansk"], fi: ["🇫🇮", "Suomi"],
        cs: ["🇨🇿", "Čeština"], el: ["🇬🇷", "Ελληνικά"], uk: ["🇺🇦", "Українська"],
        hu: ["🇭🇺", "Magyar"], ro: ["🇷🇴", "Română"], he: ["🇮🇱", "עברית"],
        hi: ["🇮🇳", "हिन्दी"], id: ["🇮🇩", "Indonesia"], vi: ["🇻🇳", "Tiếng Việt"],
        th: ["🇹🇭", "ไทย"]
      };
      let regions = null;     // dernier /api/geo reçu (pour re-render i18n)

      function info(code) {
        const c = String(code || "").slice(0, 2).toLowerCase();
        if (c && c !== "??" && MAP[c]) return { flag: MAP[c][0], name: MAP[c][1] };
        return { flag: "🌍", name: t("geo_elsewhere") };
      }

      function render() {
        if (!regions || !regions.length) { block.style.display = "none"; return; }
        // top 8, agrège le reste sous « Ailleurs » ; barres proportionnelles au max.
        const top = regions.slice(0, 8);
        const max = top.reduce((m, r) => Math.max(m, Number(r.n) || 0), 0) || 1;
        list.innerHTML = top.map((r) => {
          const meta = info(r.c);
          const n = Math.max(0, Number(r.n) || 0);
          const w = Math.max(4, Math.round((n / max) * 100));
          return '<div class="geo-row">' +
            '<span class="geo-flag" aria-hidden="true">' + meta.flag + "</span>" +
            '<span class="geo-name">' + escapeHtml(meta.name) + "</span>" +
            '<span class="geo-count">' + n.toLocaleString(LANG) + "</span>" +
            '<span class="geo-track"><i class="geo-bar" data-w="' + w + '"></i></span>' +
            "</div>";
        }).join("");
        block.style.display = "block";
        // largeur posée après insertion pour déclencher la transition.
        requestAnimationFrame(() => {
          list.querySelectorAll(".geo-bar").forEach((b) => { b.style.width = (b.dataset.w || 0) + "%"; });
        });
      }

      async function pull() {
        try {
          const r = await fetch("/api/geo", { cache: "no-store" });
          if (!r.ok) throw new Error("bad status");
          const data = await r.json();
          regions = (data && Array.isArray(data.regions)) ? data.regions : [];
          render();
        } catch (e) { block.style.display = "none"; }
      }

      function init() { pull(); setInterval(pull, 20000); }   // même cadence que les stats
      function onLang() { if (regions) render(); }            // re-traduit « Ailleurs » + sépare. milliers

      return { init, onLang };
    })();

    // ====== boot ======
    apply();
    KIND.init();
    GEO.init();
    langSel.addEventListener("change", KIND.onLang);
    langSel.addEventListener("change", GEO.onLang);
    if (window.UWGStats) UWGStats.mount({ getLang: function () { return LANG; } });
