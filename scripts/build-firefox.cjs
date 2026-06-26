// Construit une copie Firefox de l'extension dans dist/firefox/.
// Firefox a besoin de "browser_specific_settings" ; on le garde HORS du paquet
// Chrome (qui afficherait un avertissement) et on l'ajoute seulement ici.
// Ensuite : `npx web-ext build -s dist/firefox` (zip/xpi) ou charge le dossier
// via about:debugging. Firefox 121+ (service worker MV3).
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist", "firefox");
const FILES = [
  "manifest.json", "background.js", "content.js", "content.css", "mirror.js",
  "popup.html", "popup.js", "scoreboard.js", "uwg-core.js"
];

fs.rmSync(path.join(ROOT, "dist", "firefox"), { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
fs.mkdirSync(path.join(OUT, "icons"), { recursive: true });
for (const ic of fs.readdirSync(path.join(ROOT, "icons")))
  fs.copyFileSync(path.join(ROOT, "icons", ic), path.join(OUT, "icons", ic));

// patch du manifeste pour Firefox
const m = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
m.browser_specific_settings = {
  gecko: { id: "nounours@nounours.app", strict_min_version: "121.0" }
};
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(m, null, 2) + "\n");

console.log("✅ Copie Firefox prête dans dist/firefox/ (manifest v" + m.version + ", gecko id ajouté).");
console.log("   Build/sign : npx web-ext build -s dist/firefox   (ou about:debugging pour tester).");
