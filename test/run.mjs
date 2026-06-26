// Tests du noyau (uwg-core) + du compte sans compte (scoreboard), sans navigateur.
// Lancé par `node test/run.mjs` (et par la CI). Aucune dépendance.

// --- stub minimal de chrome.storage (en mémoire) ---
const store = {};
globalThis.chrome = {
  storage: {
    local: {
      get: (key, cb) => cb({ [key]: store[key] }),
      set: (obj, cb) => { Object.assign(store, obj); cb && cb(); },
    },
    onChanged: { addListener: () => {} },
  },
  runtime: { sendMessage: () => {} },
};

await import("../uwg-core.js");
await import("../scoreboard.js");
const C = globalThis.UWGCore;
const B = globalThis.UWGBoard;

let pass = 0, fail = 0;
const ok = (cond, msg) => { cond ? pass++ : fail++; console.log((cond ? "ok   " : "FAIL ") + msg); };

// ---- uwg-core : détection multilingue ----
ok(C.detect("Cállate, eres basura, idiota.", "fr") === "es", "detect ES");
ok(C.detect("Halt die Klappe, du Versager.", "fr") === "de", "detect DE");
ok(C.detect("Sei uno stupido, taci.", "fr") === "it", "detect IT");
ok(C.detect("Hou je mond, mislukkeling.", "fr") === "nl", "detect NL");
ok(C.detect("C'est joli, bravo !", "fr") === null, "gentil -> null");

// ---- anti-obfuscation ----
ok(C.detect("t'es vraiment c0nnard", "fr") === "fr", "leet: c0nnard détecté");
ok(C.detect("saloooope", "fr") === "fr", "lettres répétées détectées");
ok(C.detect("you are 5tupid", "en") === "en", "leet EN: 5tupid");
ok(C.detect("d3gage espece de debile", "fr") === "fr", "leet: d3gage");
ok(C.detect("Belle journée 2024, bravo à tous", "fr") === null, "texte normal avec chiffres -> null");

// ---- uwg-core : réponses thèmes / intensité ----
const seed = "quel idiot, t'es nul";
ok(C.reply({ theme: "nounours", intensity: "medium", lang: "fr", seed }).startsWith("🧸"), "reply nounours");
ok(C.reply({ theme: "chatons", intensity: "medium", lang: "fr", seed }).startsWith("🐱"), "reply chatons");
ok(C.reply({ theme: "meme", intensity: "medium", lang: "fr", seed }).startsWith("👵"), "reply meme");
ok(C.reply({ theme: "bobross", intensity: "medium", lang: "fr", seed }).startsWith("🎨"), "reply bobross");
ok(C.reply({ theme: "nounours", intensity: "doux", lang: "fr", seed }).startsWith("💛"), "doux -> 💛");
const hc = C.reply({ theme: "nounours", intensity: "hardcore", lang: "fr", seed });
ok(hc.length > C.reply({ theme: "nounours", intensity: "medium", lang: "fr", seed }).length - 1, "hardcore = base + pique");
ok(C.reply({ theme: "nounours", intensity: "medium", lang: "fr", seed }) === C.reply({ theme: "nounours", intensity: "medium", lang: "fr", seed }), "réponse stable");

// ---- uwg-core : niveaux ----
ok(C.levelFor(0).title === "Nouveau-né nounours", "niveau 0");
ok(C.levelFor(10).title === "Apprenti Câlin", "niveau 10");
ok(C.levelFor(9).next.min === 10, "next à 9 = 10");
ok(C.levelFor(1000000).next === null, "niveau max");

// ---- easter egg : Nounours Légendaire ----
ok(typeof C.isLegendary === "function", "isLegendary exposé");
ok(C.isLegendary("meme texte") === C.isLegendary("meme texte"), "isLegendary déterministe");
let legSeed = null;
for (let i = 0; i < 300; i++) { if (C.isLegendary("x" + i)) { legSeed = "x" + i; break; } }
ok(legSeed !== null, "des graines légendaires existent");
ok(C.reply({ theme: "nounours", lang: "fr", seed: legSeed, legendary: true }).includes("🌟"), "reply légendaire = doré 🌟");
ok(!C.reply({ theme: "nounours", lang: "fr", seed: "abc", legendary: false }).includes("🌟"), "reply normal ≠ légendaire");
ok(C.reply({ lang: "de", seed: legSeed, legendary: true }).includes("🌟"), "légendaire multilingue (DE)");

// ---- scoreboard : identité + export/import ----
const acc1 = await B.ensureAccount();
ok(acc1.uid && acc1.secret && acc1.token, "ensureAccount crée uid+secret+token");
const acc2 = await B.ensureAccount();
ok(acc2.uid === acc1.uid, "identité persistée");
await B.update({ pseudo: "Mémé🧸" });
const code = await B.exportAccount();
ok(code.startsWith("UWG1:"), "exportAccount -> code UWG1");
// on efface tout puis on restaure
delete store.uwg_account;
const restored = await B.importAccount(code);
ok(restored.uid === acc1.uid && restored.secret === acc1.secret, "importAccount restaure uid+secret");
ok(restored.pseudo === "Mémé🧸", "pseudo (accents+emoji) restauré");
ok(restored.token === acc1.token, "token recalculé identique");
let threw = false;
try { await B.importAccount("n'importe quoi"); } catch (_) { threw = true; }
ok(threw, "import d'un code invalide -> erreur");

// ---- stats.js : helpers purs du tableau de bord ----
const S = (await import("../site/stats.js")).default;
ok(S.formatCount(1234, "en").replace(/[^0-9]/g, "") === "1234", "formatCount garde les chiffres");
ok(S.formatCount(-5, "fr") === "0", "formatCount borne a 0");
ok(S.formatCount(1.9, "fr") === "1", "formatCount plancher");
ok(S.countupValue(100, 0) === 0, "countup debut = 0");
ok(S.countupValue(100, 1) === 100, "countup fin = cible");
ok(S.countupValue(100, 0.5) > 0 && S.countupValue(100, 0.5) <= 100, "countup milieu borne");
ok(S.sparkPoints([0, 5, 10], 220, 44, 3).split(" ").length === 3, "sparkPoints : 3 points");
ok(S.sparkPoints([], 100, 30) === "", "sparkPoints vide -> ''");
const _mem = {}, _store = { getItem: (k) => (k in _mem ? _mem[k] : null), setItem: (k, v) => { _mem[k] = v; } };
ok(S.sessionId(_store) === S.sessionId(_store) && S.sessionId(_store).length > 3, "sessionId stable dans la session");

// ---- server.js : presence live (RAM) + stats agregees ----
const SRV = (await import("../server/server.js")).default;
SRV._reset();
SRV.recordBeat("sidA", "1.1.1.1", 0, 0, false);
ok(SRV.computeLive(0) === 1, "1 battement -> 1 present");
SRV.recordBeat("sidA", "1.1.1.1", 1000, 0, false); // meme session
ok(SRV.computeStats(1000, 0).total === 1, "meme session = 1 seule visite");
SRV.recordBeat("sidB", "1.1.1.1", 1000, 0, false);
ok(SRV.computeLive(1000) === 2, "2 sessions = 2 presents");
for (let i = 0; i < 20; i++) SRV.recordBeat("f" + i, "9.9.9.9", 1000, 0, false);
ok(SRV.computeLive(1000) === 2 + SRV.LIVE_CAP_PER_IP, "plafond par IP (anti-gonflage)");
ok(SRV.computeLive(1000 + SRV.LIVE_WINDOW + 1) === 0, "fenetre expiree -> 0 present");
SRV.scores.u1 = { token: "t", pseudo: "X", total: 30 };
SRV.scores.u2 = { token: "t", pseudo: "Y", total: 12 };
const _st = SRV.computeStats(0, 0);
ok(_st.accounts === 2, "comptes = 2");
ok(_st.transformed === 42, "mechancetes adoucies = somme des scores");

console.log(`\n${pass}/${pass + fail} tests verts`);
process.exit(fail ? 1 : 0);
