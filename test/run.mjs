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
ok(C.detect("Zamknij się, ty frajerze.", "fr") === "pl", "detect PL");
ok(C.detect("Ładny dzień, gratulacje dla wszystkich!", "fr") === null, "gentil PL -> null");
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

// ---- badges / succès ----
ok(typeof C.earnedBadges === "function" && Array.isArray(C.BADGES), "BADGES + earnedBadges exposés");
ok(C.earnedBadges({ total: 0 }).length === 0, "0 câlin -> aucun badge");
ok(C.earnedBadges({ total: 1 }).some((b) => b.id === "premier"), "1 câlin -> Premier câlin");
ok(C.earnedBadges({ total: 150 }).some((b) => b.id === "maitre"), "150 -> Maître Câlin");
ok(C.earnedBadges({ total: 5, langs: ["fr", "en", "de"] }).some((b) => b.id === "polyglotte"), "3 langues -> Polyglotte");
ok(!C.earnedBadges({ total: 5, langs: ["fr", "en"] }).some((b) => b.id === "polyglotte"), "2 langues -> pas Polyglotte");
ok(C.earnedBadges({ total: 5, langs: ["fr","en","es","it","de","pt","nl"] }).some((b) => b.id === "babel"), "7 langues -> Babel");
ok(C.earnedBadges({ total: 1, legendary: 1 }).some((b) => b.id === "dore"), "légendaire vu -> badge doré");

// ---- séries quotidiennes ----
ok(typeof C.updateStreak === "function", "updateStreak exposé");
ok(C.updateStreak({}, "2026-06-26").days === 1, "nouveau -> jour 1");
ok(C.updateStreak({ days: 1, last: "2026-06-26" }, "2026-06-26").days === 1, "même jour -> inchangé");
ok(C.updateStreak({ days: 3, last: "2026-06-26" }, "2026-06-27").days === 4, "jour consécutif -> +1");
ok(C.updateStreak({ days: 9, last: "2026-06-20" }, "2026-06-27").days === 1, "trou -> reset à 1");
ok(C.earnedBadges({ total: 5, streak: { days: 7, last: "x" } }).some((b) => b.id === "serie7"), "7 jours -> badge série 🔥");

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

// ---- scoreboard : suppression autonome (code DEL1) ----
const delCode = await B.generateDeletionCode();
ok(delCode.startsWith("DEL1:"), "generateDeletionCode -> DEL1");
const delPayload = B.parseDeletionCode(delCode);
ok(delPayload.uid === acc1.uid && delPayload.sig && delPayload.exp, "parseDeletionCode extrait uid+sig+exp");
ok(delPayload.exp > Math.floor(Date.now() / 1000), "code DEL1 : expiration dans le futur");

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

// ---- server.js : garde de la cle admin (NOUNOURS_ADMIN_KEY) ----
ok(typeof SRV.checkAdminKey === "function", "checkAdminKey exposé");
ok(SRV.checkAdminKey("s3cr3t", "s3cr3t") === true, "cle admin correcte -> true");
ok(SRV.checkAdminKey("mauvaise", "s3cr3t") === false, "cle admin erronee -> false");
ok(SRV.checkAdminKey("peu importe", "") === false, "cle serveur vide (admin désactivé) -> false");
ok(SRV.adminScores()[0].total >= SRV.adminScores()[1].total, "adminScores trié décroissant");

// ---- server.js : Feature #4 — faux positifs signalés (compteur par langue) ----
SRV._reset();
ok(typeof SRV.recordReport === "function", "recordReport exposé");
SRV.recordReport("fr"); SRV.recordReport("fr"); SRV.recordReport("en");
ok(SRV.stats.reports.fr === 2 && SRV.stats.reports.en === 1, "reports comptés par langue");
ok(SRV.cleanLang("FR") === "fr", "cleanLang normalise la casse");
ok(SRV.cleanLang("texte du commentaire") === "te", "cleanLang ne garde que 2 lettres (zéro texte)");
ok(SRV.cleanLang("9!") === "xx", "cleanLang : non-langue -> xx");

// ---- server.js : Feature #10 — équipes (jointure + agrégation) ----
SRV._reset();
SRV.scores.a = { token: "t", pseudo: "A", total: 30, team: SRV.cleanTeam("Les Nounours") };
SRV.scores.b = { token: "t", pseudo: "B", total: 12, team: SRV.cleanTeam("Les Nounours") };
SRV.scores.c = { token: "t", pseudo: "C", total: 50, team: SRV.cleanTeam("Solo") };
SRV.scores.d = { token: "t", pseudo: "D", total: 5 }; // sans équipe -> ignoré
const _teams = SRV.teams(10);
const _nounours = _teams.find((e) => e.team === "Les Nounours");
ok(_nounours && _nounours.total === 42, "équipe : somme des totaux des membres");
ok(_nounours && _nounours.members === 2, "équipe : nombre de membres");
ok(_teams[0].team === "Solo" && _teams[0].total >= _teams[1].total, "équipes triées décroissant");
ok(_teams.length === 2, "membres sans équipe non comptés");
ok(_teams[0].rank === 1 && _teams[1].rank === 2, "rangs d'équipe attribués");
ok(SRV.cleanTeam("x".repeat(40)).length === 24, "cleanTeam borne à 24");
// jointure : verrouillée par token (comme /score)
SRV._reset();
SRV.scores.u = { token: "good", pseudo: "U", total: 7 };
SRV.scores.u.team = SRV.cleanTeam("Équipe ☀️");
ok(SRV.teams(5)[0].team === "Équipe ☀️" && SRV.teams(5)[0].members === 1, "joindre une équipe la crée");

// ---- uwg-core : Feature #2 — applyOverrides / clearOverrides (DATA ONLY) ----
ok(typeof C.applyOverrides === "function" && typeof C.clearOverrides === "function", "applyOverrides/clearOverrides exposés");
C.clearOverrides(); // état propre avant
// 1) un mot de lexique ajouté rend détectable une phrase qui ne l'était pas
ok(C.detect("you are such a wibblywomp", "en") === null, "avant override : phrase non détectée");
C.applyOverrides({ lex: { en: ["wibblywomp"] } });
ok(C.detect("you are such a wibblywomp", "en") === "en", "après override : mot ajouté détecté");
// 2) une réplique ajoutée entre dans la banque (atteignable par un seed)
C.applyOverrides({ replies: { nounours: { en: ["ZZ_OVERRIDE_LINE_ZZ"] } } });
let ovHit = false;
for (let i = 0; i < 600; i++) { if (C.reply({ theme: "nounours", lang: "en", seed: "ov" + i }) === "ZZ_OVERRIDE_LINE_ZZ") { ovHit = true; break; } }
ok(ovHit, "réplique ajoutée atteignable dans la banque");
// 3) garbage / non-tableaux / non-chaines ignorés, ne cassent rien
C.applyOverrides({ lex: { en: [123, null, {}, ["x"], "realword"] }, replies: "pas-un-objet", lex2: 42 });
ok(C.detect("here is a realword test", "en") === "en", "chaîne valide parmi du garbage : ajoutée");
ok(C.detect("the number 123 stands alone", "en") === null, "nombre 123 ignoré (DATA ONLY)");
ok(C.detect("you are such a wibblywomp", "en") === "en", "override précédent toujours actif (non cassé)");
// 4) idempotent-ish : ré-appliquer le même mot ne le duplique pas (détection stable)
C.applyOverrides({ lex: { en: ["wibblywomp"] } });
ok(C.detect("you are such a wibblywomp", "en") === "en", "ré-appliquer le même mot reste détecté");
// 5) borne de taille : >500 entrées capées, pas de crash
const huge = []; for (let i = 0; i < 700; i++) huge.push("capword" + i);
C.applyOverrides({ lex: { en: huge } });
ok(C.detect("capword0 here", "en") === "en", "1re entrée d'une grosse liste capée détectée");
// 6) clearOverrides remet l'état livré : mots ajoutés ET répliques disparaissent
C.clearOverrides();
ok(C.detect("you are such a wibblywomp", "en") === null, "clearOverrides : mot ajouté retiré");
let ovGone = true;
for (let i = 0; i < 600; i++) { if (C.reply({ theme: "nounours", lang: "en", seed: "ov" + i }) === "ZZ_OVERRIDE_LINE_ZZ") { ovGone = false; break; } }
ok(ovGone, "clearOverrides : réplique ajoutée retirée");
// la détection/réponse d'origine reste intacte après clear
ok(C.detect("you suck", "en") === "en", "détection built-in intacte après clear");
ok(C.reply({ theme: "nounours", intensity: "medium", lang: "fr", seed }).startsWith("🧸"), "réponse built-in intacte après clear");

// ---- server.js : Feature #6 — carte de chaleur (compteur agrégé par langue) ----
SRV._reset();
ok(typeof SRV.recordGeo === "function" && typeof SRV.geo === "function", "recordGeo/geo exposés");
ok(SRV.primaryLang("fr-CA,fr;q=0.9,en;q=0.8") === "fr", "primaryLang : 1er sous-tag (fr-CA -> fr)");
ok(SRV.primaryLang("EN-US") === "en", "primaryLang : casse normalisée");
ok(SRV.primaryLang("") === "??" && SRV.primaryLang(undefined) === "??", "primaryLang : vide -> ??");
ok(SRV.primaryLang("12-x") === "??", "primaryLang : non-lettres -> ?? (zéro texte)");
SRV.recordGeo("fr-FR"); SRV.recordGeo("fr"); SRV.recordGeo("en-GB"); SRV.recordGeo("zzz");
ok(SRV.stats.geo.fr === 2 && SRV.stats.geo.en === 1, "geo : compté agrégé par langue");
const _g = SRV.geo(20);
ok(_g.regions[0].c === "fr" && _g.regions[0].n === 2, "geo : trié décroissant, forme {c,n}");
ok(_g.regions.every((r) => Object.keys(r).sort().join(",") === "c,n"), "geo : uniquement {c,n} (zéro IP, zéro identifiant)");

// ---- server.js : Feature #2 — validation des overrides (tableaux de chaines) ----
ok(typeof SRV.sanitizeOverrides === "function", "sanitizeOverrides exposé");
const _okOv = SRV.sanitizeOverrides({ lex: { fr: ["nouveau-mechant"] }, replies: { nounours: { fr: ["bisou"] } } });
ok(_okOv.ok && _okOv.value.lex.fr[0] === "nouveau-mechant", "overrides : payload valide accepté");
ok(SRV.sanitizeOverrides({ lex: { fr: [123] } }).ok === false, "overrides : non-chaine rejeté (400)");
ok(SRV.sanitizeOverrides({ lex: { fr: "pas-un-tableau" } }).ok === false, "overrides : non-tableau rejeté (400)");
ok(SRV.sanitizeOverrides({ lex: { fr: ["x".repeat(999)] } }).ok === false, "overrides : entrée trop longue rejetée (400)");
ok(SRV.sanitizeOverrides({ lex: { fr: new Array(999).fill("ok") } }).ok === false, "overrides : tableau trop grand rejeté (400)");
ok(SRV.sanitizeOverrides([]).ok === false, "overrides : racine non-objet rejetée (400)");
ok(SRV.sanitizeOverrides({}).ok === true, "overrides : objet vide accepté");

// ---- server.js : suppression autonome (token ou DEL1) ----
SRV._reset();
const delTok = "cd".repeat(16);
SRV.scores.delu = { token: delTok, pseudo: "Z", total: 9 };
let delOut = SRV.deleteAccount({ uid: "delu", token: delTok });
ok(delOut.body.removed === true, "deleteAccount : token valide supprime");
ok(!SRV.scores.delu, "deleteAccount : entree retiree");
delOut = SRV.deleteAccount({ uid: "delu", token: delTok });
ok(delOut.body.removed === false, "deleteAccount : deja supprime");
SRV.scores.delu = { token: delTok, pseudo: "Z", total: 9 };
const delExp = Math.floor(Date.now() / 1000) + 120;
const delSig = SRV.delSig(delTok, "delu", delExp);
delOut = SRV.deleteAccount({ uid: "delu", exp: delExp, sig: delSig });
ok(delOut.body.removed === true, "deleteAccount : code DEL1 valide");
SRV.scores.delu = { token: delTok, pseudo: "Z", total: 9 };
delOut = SRV.deleteAccount({ uid: "delu", exp: delExp, sig: "00".repeat(32) });
ok(delOut.code === 403, "deleteAccount : mauvaise sig -> 403");
delOut = SRV.deleteAccount({ uid: "delu", exp: Math.floor(Date.now() / 1000) - 10, sig: delSig });
ok(delOut.code === 403, "deleteAccount : code expire -> 403");

console.log(`\n${pass}/${pass + fail} tests verts`);
process.exit(fail ? 1 : 0);
