// Un web de gentil — popup
const STORAGE_KEY = "uwg_state";
const DEFAULTS = {
  enabled: true, total: 0, theme: "nounours", intensity: "medium",
  celebrate: true, mirror: true
};
const CORE = window.UWGCore;

const $ = (id) => document.getElementById(id);
const toggle = $("toggle");
const celebrate = $("celebrate");
const mirror = $("mirror");
const intensityBox = $("intensity");
const themesBox = $("themes");

// construit les boutons de theme depuis le noyau
for (const t of CORE.THEMES) {
  const b = document.createElement("div");
  b.className = "theme";
  b.dataset.v = t.id;
  b.innerHTML = `<span class="emo">${t.emoji}</span><span class="nm">${t.label}</span>`;
  themesBox.appendChild(b);
}

function patch(partial) {
  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const st = Object.assign({}, DEFAULTS, res[STORAGE_KEY], partial);
    chrome.storage.local.set({ [STORAGE_KEY]: st });
  });
}

function render(st) {
  toggle.checked = !!st.enabled;
  celebrate.checked = !!st.celebrate;
  mirror.checked = !!st.mirror;

  themesBox.querySelectorAll(".theme").forEach((el) => {
    el.classList.toggle("active", el.dataset.v === st.theme);
  });
  intensityBox.querySelectorAll("button").forEach((el) => {
    el.classList.toggle("active", el.dataset.v === st.intensity);
  });

  const lvl = CORE.levelFor(st.total || 0);
  $("lvlTitle").textContent = lvl.title;
  $("total").textContent = String(st.total || 0);
  if (lvl.next) {
    const span = lvl.next.min - lvl.min;
    const done = (st.total || 0) - lvl.min;
    const pct = Math.max(0, Math.min(100, Math.round((done / span) * 100)));
    $("lvlBar").style.width = pct + "%";
    $("lvlNext").textContent = `${lvl.next.min - (st.total || 0)} avant « ${lvl.next.title} »`;
  } else {
    $("lvlBar").style.width = "100%";
    $("lvlNext").textContent = "niveau max atteint ✨";
  }

  // série quotidienne
  const sd = (st.streak && st.streak.days) || 0;
  $("streakLine").textContent = sd >= 1 ? "🔥 " + sd + " jour" + (sd > 1 ? "s" : "") + " d'affilée" : "";

  // succès / badges
  const earned = new Set(CORE.earnedBadges(st).map((b) => b.id));
  $("badgeCount").textContent = "(" + earned.size + "/" + CORE.BADGES.length + ")";
  const bd = $("badges");
  bd.innerHTML = "";
  for (const b of CORE.BADGES) {
    const el = document.createElement("div");
    const has = earned.has(b.id);
    el.className = "badge " + (has ? "earned" : "locked");
    el.textContent = b.emoji;
    el.title = (has ? "" : "🔒 ") + b.title;
    bd.appendChild(el);
  }
}

function load() {
  chrome.storage.local.get(STORAGE_KEY, (res) =>
    render(Object.assign({}, DEFAULTS, res[STORAGE_KEY]))
  );
}

toggle.addEventListener("change", () => patch({ enabled: toggle.checked }));
celebrate.addEventListener("change", () => patch({ celebrate: celebrate.checked }));
mirror.addEventListener("change", () => patch({ mirror: mirror.checked }));

themesBox.addEventListener("click", (e) => {
  const el = e.target.closest(".theme");
  if (el) patch({ theme: el.dataset.v });
});
intensityBox.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") patch({ intensity: e.target.dataset.v });
});

$("reset").addEventListener("click", () => patch({ total: 0 }));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) {
    render(Object.assign({}, DEFAULTS, changes[STORAGE_KEY].newValue));
  }
});

load();

// ---------------------------------------------------------------------------
// Classement (compte sans compte)
// ---------------------------------------------------------------------------
const Board = window.UWGBoard;
const boardJoin = $("boardJoin");
const boardView = $("boardView");
const boardErr = $("boardErr");
const pseudoInput = $("pseudo");

function showErr(msg) {
  boardErr.style.display = msg ? "block" : "none";
  boardErr.textContent = msg || "";
}

async function refreshBoard() {
  const acc = await Board.getAccount();
  if (!acc.optedIn) {
    boardJoin.style.display = "block";
    boardView.style.display = "none";
    pseudoInput.value = acc.pseudo || "";
    showErr("");
    return;
  }
  boardJoin.style.display = "none";
  boardView.style.display = "block";
  try {
    await Board.postScore().catch(() => {}); // pousse ton score avant d'afficher
    const lb = await Board.fetchLeaderboard(10);
    showErr("");
    const me = lb.you;
    $("boardMe").textContent = me
      ? `Toi : ${me.pseudo} — #${me.rank} · ${me.total} câlin(s)`
      : `Toi : ${acc.pseudo} — pas encore classé`;
    const ol = $("boardList");
    ol.innerHTML = "";
    for (const e of lb.top) {
      const li = document.createElement("li");
      const mine = me && e.rank === me.rank && e.pseudo === me.pseudo;
      if (mine) li.className = "me";
      li.innerHTML = `<b>${escapeHtml(e.pseudo)}</b> — ${e.total}`;
      ol.appendChild(li);
    }
    if (!lb.top.length) ol.innerHTML = "<li class='note'>Personne encore. Sois le premier 🧸</li>";
  } catch (e) {
    $("boardList").innerHTML = "";
    $("boardMe").textContent = "";
    showErr("Serveur de classement hors-ligne. (Lance server/server.js)");
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

$("joinBtn").addEventListener("click", async () => {
  const p = pseudoInput.value.trim();
  if (!p) { pseudoInput.focus(); return; }
  try { await Board.join(p); } catch (_) { /* serveur offline : on opte quand meme */ }
  await Board.update({ optedIn: true, pseudo: p });
  refreshBoard();
});
pseudoInput.addEventListener("keydown", (e) => { if (e.key === "Enter") $("joinBtn").click(); });

$("renameBtn").addEventListener("click", async () => {
  const acc = await Board.getAccount();
  pseudoInput.value = acc.pseudo || "";
  boardJoin.style.display = "block";
  boardView.style.display = "none";
  pseudoInput.focus();
});

$("leaveBtn").addEventListener("click", async () => {
  await Board.leave();
  refreshBoard();
});

// --- export / import d'identité (ne jamais perdre son score) ---
const acctBox = $("acctBox"), acctIO = $("acctIO"), acctDo = $("acctDo"), acctMsg = $("acctMsg");
let acctMode = null;

$("acctSave").addEventListener("click", async () => {
  const code = await Board.exportAccount();
  acctMode = "save";
  acctBox.style.display = "block";
  acctIO.value = code;
  acctIO.readOnly = true;
  acctIO.select();
  acctDo.style.display = "none";
  try {
    await navigator.clipboard.writeText(code);
    acctMsg.textContent = "Copié ! Colle ce code sur ton autre appareil.";
  } catch (_) {
    acctMsg.textContent = "Copie ce code et garde-le précieusement.";
  }
});

$("acctRestore").addEventListener("click", () => {
  acctMode = "restore";
  acctBox.style.display = "block";
  acctIO.value = "";
  acctIO.readOnly = false;
  acctDo.style.display = "inline";
  acctDo.textContent = "Restaurer";
  acctMsg.textContent = "";
  acctIO.focus();
});

acctDo.addEventListener("click", async () => {
  if (acctMode !== "restore") return;
  try {
    await Board.importAccount(acctIO.value);
    await Board.postScore().catch(() => {});
    const lb = await Board.fetchLeaderboard(1).catch(() => null);
    if (lb && lb.you && lb.you.total) {
      chrome.storage.local.get(STORAGE_KEY, (r) => {
        const st = Object.assign({}, DEFAULTS, r[STORAGE_KEY]);
        if (lb.you.total > (st.total || 0)) { st.total = lb.you.total; chrome.storage.local.set({ [STORAGE_KEY]: st }); }
      });
    }
    acctMsg.textContent = "Compte restauré ✓";
    acctBox.style.display = "none";
    refreshBoard();
  } catch (_) {
    acctMsg.textContent = "Code invalide ✗";
  }
});

refreshBoard();

// ---------------------------------------------------------------------------
// Carte sociale partageable (image PNG de ton rang/badges)
// ---------------------------------------------------------------------------
function drawShareCard(canvas, d) {
  const W = 1200, Hh = 630;
  canvas.width = W; canvas.height = Hh;
  const x = canvas.getContext("2d");
  const g = x.createLinearGradient(0, 0, W, Hh);
  g.addColorStop(0, "#FBD27A"); g.addColorStop(0.55, "#F4A93B"); g.addColorStop(1, "#FF6B5E");
  x.fillStyle = g; x.fillRect(0, 0, W, Hh);
  const F = (px, w) => (w || "") + px + 'px "Fredoka","Segoe UI",system-ui,sans-serif';
  const EMO = (px) => px + 'px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
  x.font = EMO(170); x.fillText("🧸", 70, 255);
  x.fillStyle = "#3A2A1E";
  x.font = F(56, "600 "); x.fillText("Un web de gentil", 310, 140);
  x.font = F(56, "700 "); x.fillText((d.pseudo || "Un nounours anonyme").slice(0, 24), 70, 360);
  const tot = d.total || 0;
  x.font = F(40); x.fillText("a câliné " + tot.toLocaleString("fr-FR") + " troll" + (tot > 1 ? "s" : ""), 70, 420);
  let line = "🏅 " + (d.level || "");
  if (d.rank) line += "   ·   #" + d.rank + " mondial";
  if (d.streak >= 1) line += "   ·   🔥 " + d.streak + " j";
  x.font = F(34); x.fillText(line, 70, 476);
  if (d.badges && d.badges.length) { x.font = EMO(50); x.fillText(d.badges.slice(0, 12).join("  "), 70, 556); }
  x.fillStyle = "#fff"; x.font = F(38, "700 "); x.fillText("nounours.app  🧸", 70, 606);
}

async function makeShareCard() {
  const res = await new Promise((r) => chrome.storage.local.get(STORAGE_KEY, r));
  const st = Object.assign({}, DEFAULTS, res[STORAGE_KEY]);
  const acc = await Board.getAccount();
  let rank = null;
  try { const lb = await Board.fetchLeaderboard(1); if (lb && lb.you) rank = lb.you.rank; } catch (_) {}
  const data = {
    pseudo: acc.pseudo,
    total: st.total || 0,
    level: CORE.levelFor(st.total || 0).title,
    streak: (st.streak && st.streak.days) || 0,
    badges: CORE.earnedBadges(st).map((b) => b.emoji),
    rank
  };
  const canvas = document.createElement("canvas");
  drawShareCard(canvas, data);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ma-carte-nounours.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    try { navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); } catch (_) {}
  }, "image/png");
}
document.getElementById("cardBtn").addEventListener("click", makeShareCard);
