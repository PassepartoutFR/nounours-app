// Construit une copie Firefox de l'extension dans dist/firefox/ (+ zip optionnel).
// Firefox a besoin de "browser_specific_settings" ; on le garde HORS du paquet
// Chrome (qui afficherait un avertissement) et on l'ajoute seulement ici.
// Ensuite : charger dist/firefox via about:debugging, ou publier le zip sur AMO.
// Firefox 121+ (service worker MV3).
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist", "firefox");
const GECKO_ID = "nounours@nounours.app";
const GECKO_MIN = "121.0";

// Aligné sur .github/workflows/release.yml (paquet Chrome store).
const FILES = [
  "manifest.json", "background.js", "content.js", "content.css", "mirror.js",
  "popup.html", "popup.js", "scoreboard.js", "uwg-core.js",
  "offscreen.html", "offscreen.js", "sandbox.html", "sandbox.js",
];
const DIRS = ["icons", "vendor"];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function zipFirefox(outDir, zipPath) {
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  if (process.platform === "win32") {
    const ps = [
      "$ErrorActionPreference = 'Stop'",
      `Set-Location -LiteralPath '${outDir.replace(/'/g, "''")}'`,
      `Compress-Archive -Path * -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`,
    ].join("; ");
    execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });
  } else {
    execSync(`cd "${outDir}" && zip -qr "${zipPath}" .`, { stdio: "inherit" });
  }
}

// --- build ---
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) throw new Error("Fichier manquant pour Firefox : " + f);
  fs.copyFileSync(src, path.join(OUT, f));
}
for (const d of DIRS) {
  const src = path.join(ROOT, d);
  if (!fs.existsSync(src)) throw new Error("Dossier manquant pour Firefox : " + d);
  copyDir(src, path.join(OUT, d));
}

const m = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
m.browser_specific_settings = {
  gecko: { id: GECKO_ID, strict_min_version: GECKO_MIN },
};
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(m, null, 2) + "\n");

const zipName = `nounours-firefox-${m.version}.zip`;
const zipPath = path.join(ROOT, "dist", zipName);
zipFirefox(OUT, zipPath);

console.log("✅ Copie Firefox prête dans dist/firefox/ (manifest v" + m.version + ", gecko " + GECKO_ID + ").");
console.log("   Zip : dist/" + zipName);
console.log("   Test : about:debugging → « Charger un module temporaire » → dist/firefox/manifest.json");
console.log("   AMO  : npx web-ext sign -s dist/firefox --api-key ... --api-secret ...");