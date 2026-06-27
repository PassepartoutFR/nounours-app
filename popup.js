// Un web de gentil — popup
const STORAGE_KEY = "uwg_state";
const DEFAULTS = {
  enabled: true, total: 0, theme: "nounours", intensity: "medium",
  celebrate: true, mirror: true, highlightOnly: false, remoteLists: false,
  sensitivity: "precise", aiMode: false, aiThreshold: 0.9
};
const CORE = window.UWGCore;

const $ = (id) => document.getElementById(id);
const toggle = $("toggle");
const celebrate = $("celebrate");
const mirror = $("mirror");
const highlightOnly = $("highlightOnly");
const remoteLists = $("remoteLists");
const aiMode = $("aiMode");
const sensitivity = $("sensitivity");
const intensityBox = $("intensity");
const themesBox = $("themes");
// IA locale — éléments d'OBSERVABILITÉ (état + bouton de test + résultat)
const aiStatusEl = $("aiStatus");
const aiTestRow = $("aiTestRow");
const aiTestBtn = $("aiTestBtn");
const aiTestResult = $("aiTestResult");

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
  highlightOnly.checked = !!st.highlightOnly;
  remoteLists.checked = !!st.remoteLists;
  aiMode.checked = !!st.aiMode;
  sensitivity.value = st.sensitivity === "large" ? "large" : "precise";

  // Observabilité IA : la ligne d'état + le bouton de test ne sont visibles que si l'IA
  // est activée. On (re)lit l'état courant à chaque rendu (et storage.onChanged le tient
  // à jour en direct pour les transitions loading -> ready|error pendant l'ouverture).
  setAiUiVisible(!!st.aiMode);
  refreshAiStatus();

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

  renderLangStats(st);
}

function renderLangStats(st) {
  const box = $("langStats");
  if (!box) return;
  const list = CORE.langStatsList(st.langCounts, st.total || 0);
  if (!list.length) {
    box.innerHTML = '<div class="langstats-empty">Navigue un peu — tes câlins par langue s\'afficheront ici.</div>';
    return;
  }
  const max = list[0].count;
  box.innerHTML = "";
  for (const row of list) {
    const el = document.createElement("div");
    el.className = "langstat";
    el.title = row.count + " câlin" + (row.count > 1 ? "s" : "") + " · " + row.pct + " %";
    const barW = max > 0 ? Math.max(4, Math.round((row.count / max) * 100)) : 0;
    const lbl = document.createElement("span");
    lbl.textContent = row.meta.flag + " " + row.meta.label;
    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("i");
    fill.style.width = barW + "%";
    bar.appendChild(fill);
    const num = document.createElement("span");
    num.className = "n";
    num.textContent = String(row.count);
    el.append(lbl, bar, num);
    box.appendChild(el);
  }
}

function load() {
  chrome.storage.local.get(STORAGE_KEY, (res) =>
    render(Object.assign({}, DEFAULTS, res[STORAGE_KEY]))
  );
}

// ---------------------------------------------------------------------------
// IA locale — OBSERVABILITÉ (état live + bouton de test)
// ---------------------------------------------------------------------------
// Source de vérité : chrome.storage.local.uwg_ai_status (écrite par offscreen.js / le SW).
//   "loading" -> téléchargement/chargement ; "ready" -> modèle prêt ; "error: …" -> panne ;
//   "off"/absente -> IA désactivée. Tout est fail-safe : une erreur ici ne casse jamais le popup.
const AI_STATUS_KEY = "uwg_ai_status";

function setAiUiVisible(on) {
  try {
    if (aiStatusEl) aiStatusEl.style.display = on ? "block" : "none";
    if (aiTestRow) aiTestRow.style.display = on ? "block" : "none";
  } catch (_) {}
}

// Traduit une valeur de uwg_ai_status en texte (et marque le warning visuel sur erreur).
function renderAiStatus(value) {
  if (!aiStatusEl) return;
  aiStatusEl.classList.remove("warn");
  const v = typeof value === "string" ? value : "";
  if (v === "loading") {
    aiStatusEl.textContent = "⏳ Téléchargement / chargement du modèle… (~25 Mo la 1ʳᵉ fois)";
  } else if (v === "ready") {
    aiStatusEl.textContent = "✅ Modèle prêt — l'IA est active";
  } else if (v.indexOf("error:") === 0) {
    aiStatusEl.classList.add("warn");
    aiStatusEl.textContent = "⚠️ " + v.slice("error:".length).trim();
  } else {
    // "off" / absente / inconnue : rien à montrer quand l'IA est activée mais pas encore lancée
    aiStatusEl.textContent = "désactivée";
  }
}

function refreshAiStatus() {
  try {
    chrome.storage.local.get(AI_STATUS_KEY, (r) => {
      try { renderAiStatus(r && r[AI_STATUS_KEY]); } catch (_) {}
    });
  } catch (_) {}
}

// Live : quand le SW/offscreen écrit uwg_ai_status pendant que le popup est ouvert, on
// rafraîchit la ligne d'état immédiatement (transitions loading -> ready|error visibles).
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[AI_STATUS_KEY]) {
      try { renderAiStatus(changes[AI_STATUS_KEY].newValue); } catch (_) {}
    }
  });
} catch (_) {}

// Bouton « 🧪 Tester l'IA » : preuve vivante que l'IA tourne. On classe un texte de test
// connu pour être toxique et on affiche le score renvoyé. Entièrement gardé (fail-safe).
if (aiTestBtn) {
  aiTestBtn.addEventListener("click", () => {
    const TEST_TEXT = "What a stupid moro";
    const THRESHOLD = 0.9; // même seuil que le chemin « cas gris » (DEFAULTS.aiThreshold)
    if (aiTestResult) { aiTestResult.classList.remove("warn"); aiTestResult.textContent = "⏳ test en cours — chargement du modèle (~25 Mo) si besoin, patiente…"; }
    try {
      chrome.runtime.sendMessage({ type: "uwg-ai-test", text: TEST_TEXT }, (resp) => {
        if (!aiTestResult) return;
        try {
          if (chrome.runtime.lastError) {
            aiTestResult.classList.add("warn");
            aiTestResult.textContent = "⚠️ erreur: " + chrome.runtime.lastError.message;
            return;
          }
          if (!resp || resp.error || typeof resp.score !== "number") {
            aiTestResult.classList.add("warn");
            const why = (resp && resp.error) ? resp.error : "réponse invalide";
            aiTestResult.textContent = "⚠️ erreur: " + why;
            return;
          }
          const s = resp.score;
          const verdict = s >= THRESHOLD ? "🧸 serait câliné" : "laissé tel quel";
          aiTestResult.textContent = "« " + TEST_TEXT + " » → score " + s.toFixed(2) + " → " + verdict;
        } catch (_) {
          aiTestResult.classList.add("warn");
          aiTestResult.textContent = "⚠️ erreur inattendue";
        }
      });
    } catch (e) {
      if (aiTestResult) {
        aiTestResult.classList.add("warn");
        aiTestResult.textContent = "⚠️ erreur: " + ((e && e.message) || e);
      }
    }
  });
}

toggle.addEventListener("change", () => patch({ enabled: toggle.checked }));
celebrate.addEventListener("change", () => patch({ celebrate: celebrate.checked }));
mirror.addEventListener("change", () => patch({ mirror: mirror.checked }));
highlightOnly.addEventListener("change", () => patch({ highlightOnly: highlightOnly.checked }));
// Feature #2 — opt-in listes en ligne (défaut OFF). Activer => le service worker
// récupérera /lists au prochain cycle ; désactiver => zéro appel réseau pour les listes.
remoteLists.addEventListener("change", () => patch({ remoteLists: remoteLists.checked }));
// IA locale (opt-in, défaut OFF) : adoucit aussi les insultes voilées (cas gris) via un
// petit modèle 100 % local. OFF => zéro document offscreen, zéro modèle, aucun changement.
aiMode.addEventListener("change", () => patch({ aiMode: aiMode.checked }));
// Sensibilité de détection : "precise" (défaut, 0 FP) | "large" (mots durs isolés adoucis).
sensitivity.addEventListener("change", () => patch({ sensitivity: sensitivity.value }));

themesBox.addEventListener("click", (e) => {
  const el = e.target.closest(".theme");
  if (el) patch({ theme: el.dataset.v });
});
intensityBox.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") patch({ intensity: e.target.dataset.v });
});

$("reset").addEventListener("click", () => patch({ total: 0, langCounts: {} }));

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
    await refreshTeam();
  } catch (e) {
    $("boardList").innerHTML = "";
    $("boardMe").textContent = "";
    showErr("Serveur de classement hors-ligne. (Lance server/server.js)");
  }
}

// ---------------------------------------------------------------------------
// Équipe / guilde (opt-in, code libre — aucune donnée perso)
// ---------------------------------------------------------------------------
async function refreshTeam() {
  const acc = await Board.getAccount();
  const team = (acc.team || "").trim();
  const teamJoin = $("teamJoin");
  const teamView = $("teamView");
  if (!team) {
    teamJoin.style.display = "flex";
    teamView.style.display = "none";
    $("teamInput").value = "";
    return;
  }
  teamJoin.style.display = "none";
  teamView.style.display = "block";
  // affiche le nom de l'équipe + son rang dans le classement des équipes
  let line = "Équipe : " + escapeHtml(team);
  try {
    const data = await Board.fetchTeams(50);
    const list = (data && data.teams) || [];
    const idx = list.findIndex((t) => t.team === team);
    if (idx >= 0) {
      const t = list[idx];
      line = "🛡️ " + escapeHtml(team) + " — #" + t.rank + " · " + t.total + " câlin(s) · " +
        t.members + " membre" + (t.members > 1 ? "s" : "");
    }
  } catch (_) { /* serveur offline : on garde juste le nom */ }
  $("teamMe").innerHTML = line;
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

// --- équipe : rejoindre / quitter ---
$("teamJoinBtn").addEventListener("click", async () => {
  const t = $("teamInput").value.trim().slice(0, 24);
  if (!t) { $("teamInput").focus(); return; }
  try {
    await Board.joinTeam(t);
  } catch (_) {
    showErr("Impossible de rejoindre l'équipe (serveur hors-ligne ?).");
    return;
  }
  showErr("");
  await refreshTeam();
});
$("teamInput").addEventListener("keydown", (e) => { if (e.key === "Enter") $("teamJoinBtn").click(); });

$("teamLeaveBtn").addEventListener("click", async () => {
  try { await Board.joinTeam(""); } catch (_) { /* serveur offline : on retire localement */ }
  await Board.update({ team: "" });
  await refreshTeam();
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

// --- suppression autonome du classement (sans e-mail) ---
const delBox = $("delBox"), delIO = $("delIO"), delMsg = $("delMsg");

$("delCodeBtn").addEventListener("click", async () => {
  try {
    const code = await Board.generateDeletionCode();
    delBox.style.display = "block";
    delIO.value = code;
    delIO.select();
    try {
      await navigator.clipboard.writeText(code);
      delMsg.textContent = "Code copié (15 min). Colle-le sur nounours.app/privacy.html";
    } catch (_) {
      delMsg.textContent = "Valable 15 min. Colle ce code sur nounours.app/privacy.html";
    }
  } catch (_) {
    delMsg.textContent = "Impossible de générer le code.";
    delBox.style.display = "block";
  }
});

$("delNowBtn").addEventListener("click", async () => {
  if (!confirm("Supprimer ton entrée du classement sur le serveur ?\n\nTon pseudo et ton score seront effacés. Tu pourras rejoindre à nouveau plus tard.")) return;
  try {
    const res = await Board.deleteServerEntry();
    delBox.style.display = "none";
    showErr("");
    delMsg.textContent = res.removed ? "Entrée serveur supprimée ✓" : "Aucune entrée à supprimer.";
    delBox.style.display = "block";
    refreshBoard();
  } catch (e) {
    showErr("Suppression impossible (serveur hors-ligne ?).");
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

// ---------------------------------------------------------------------------
// Bannière « mise à jour disponible » (testeurs side-load GitHub)
// ---------------------------------------------------------------------------
// Le service worker écrit la clé uwg_update { version, url } quand une release
// plus récente existe. Ici on l'affiche (re-vérification de la version au cas où
// l'utilisateur aurait déjà mis à jour). FAIL-SAFE : la moindre erreur => on ne
// montre rien. On ne touche JAMAIS au badge (réservé au compteur de câlins).
const UPD_KEY = "uwg_update";
const UPD_DISMISS_KEY = "uwg_update_dismissed"; // version masquée par l'utilisateur

// Même logique que background.js (dupliquée, volontairement minuscule).
function isNewer(latest, current) {
  try {
    const a = String(latest || "").split(".");
    const b = String(current || "").split(".");
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const x = parseInt(a[i], 10), y = parseInt(b[i], 10);
      const xi = Number.isFinite(x) ? x : 0;
      const yi = Number.isFinite(y) ? y : 0;
      if (xi > yi) return true;
      if (xi < yi) return false;
    }
    return false;
  } catch (_) { return false; }
}

function renderUpdateBanner() {
  try {
    const banner = $("updateBanner");
    if (!banner) return;
    chrome.storage.local.get([UPD_KEY, UPD_DISMISS_KEY], (res) => {
      try {
        const upd = res && res[UPD_KEY];
        const dismissed = res && res[UPD_DISMISS_KEY];
        const current = chrome.runtime.getManifest().version;
        // rien à montrer, ou pas réellement plus récent (déjà à jour), ou masqué
        if (!upd || !upd.version || !isNewer(upd.version, current) || dismissed === upd.version) {
          banner.style.display = "none";
          return;
        }
        $("updateText").textContent = "🆕 Nouvelle version " + upd.version + " dispo";
        const dl = $("updateDl");
        const url = (typeof upd.url === "string" && upd.url) ||
          "https://github.com/PassepartoutFR/nounours-app/releases/latest";
        dl.href = url;
        dl.onclick = (e) => {
          try {
            if (chrome.tabs && chrome.tabs.create) {
              e.preventDefault();
              chrome.tabs.create({ url });
            }
            // sinon : on laisse le lien target=_blank faire le travail (repli)
          } catch (_) { /* fail-safe : le lien natif reste cliquable */ }
        };
        $("updateDismiss").onclick = () => {
          banner.style.display = "none";
          // mémorise la version masquée : on ne ré-embête plus pour CETTE version
          try { chrome.storage.local.set({ [UPD_DISMISS_KEY]: upd.version }); } catch (_) {}
        };
        banner.style.display = "flex";
      } catch (_) { /* fail-safe : aucune bannière */ }
    });
  } catch (_) { /* fail-safe : aucune bannière */ }
}

renderUpdateBanner();
// si le service worker écrit/efface la clé pendant que le popup est ouvert, on rafraîchit.
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes[UPD_KEY] || changes[UPD_DISMISS_KEY])) renderUpdateBanner();
  });
} catch (_) {}
