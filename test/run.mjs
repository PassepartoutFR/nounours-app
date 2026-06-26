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

console.log(`\n${pass}/${pass + fail} tests verts`);
process.exit(fail ? 1 : 0);
