// Vérifie les secrets GitHub pour l'auto-publication Chrome Web Store au tag.
// Pour obtenir le refresh_token : node tools/get-refresh-token.cjs <client_id> <client_secret>
// Puis : gh secret set CHROME_* --repo PassepartoutFR/nounours-app
"use strict";
const { execSync } = require("child_process");

const REPO = process.env.GITHUB_REPO || "PassepartoutFR/nounours-app";
const NEED = [
  "CHROME_EXTENSION_ID",
  "CHROME_CLIENT_ID",
  "CHROME_CLIENT_SECRET",
  "CHROME_REFRESH_TOKEN",
];

let names = [];
try {
  const out = execSync(`gh api repos/${REPO}/actions/secrets --jq ".secrets[].name"`, { encoding: "utf8" });
  names = out.trim().split("\n").filter(Boolean);
} catch (e) {
  console.error("Impossible de lire les secrets GitHub (gh auth login ?) :", e.message);
  process.exit(1);
}

const have = NEED.filter((n) => names.includes(n));
const miss = NEED.filter((n) => !names.includes(n));

console.log("Chrome Web Store — secrets GitHub (" + REPO + ")\n");
for (const n of have) console.log("  ✅ " + n);
for (const n of miss) console.log("  ❌ " + n + " (manquant)");

if (miss.length === 0) {
  console.log("\n✅ Auto-publication active : chaque tag vX.Y.Z publiera sur le Chrome Web Store.");
  process.exit(0);
}

console.log("\nÉtapes pour activer l'auto-publication :\n");
console.log("1. Google Cloud Console → activer « Chrome Web Store API »");
console.log("2. OAuth → ID client « Application de bureau » → client_id + client_secret");
console.log("3. node tools/get-refresh-token.cjs <client_id> <client_secret>");
console.log("4. Puis :\n");
if (!names.includes("CHROME_EXTENSION_ID")) {
  console.log('   gh secret set CHROME_EXTENSION_ID --repo ' + REPO + ' --body "<id depuis devconsole>"');
}
console.log('   gh secret set CHROME_CLIENT_ID --repo ' + REPO + ' --body "<client_id>"');
console.log('   gh secret set CHROME_CLIENT_SECRET --repo ' + REPO + ' --body "<client_secret>"');
console.log('   gh secret set CHROME_REFRESH_TOKEN --repo ' + REPO + ' --body "<refresh_token>"');
console.log("\nRelance : node scripts/setup-chrome-publish.cjs");
process.exit(miss.length ? 1 : 0);