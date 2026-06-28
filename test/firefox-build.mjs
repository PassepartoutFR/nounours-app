// Smoke test du build Firefox (scripts/build-firefox.cjs).
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist", "firefox");

const REQUIRED_FILES = [
  "manifest.json", "background.js", "content.js", "content.css", "mirror.js",
  "popup.html", "popup.js", "scoreboard.js", "uwg-core.js",
  "icons/icon16.png", "icons/icon48.png", "icons/icon128.png",
];

export async function runFirefoxBuildTests(ok) {
  execSync("node scripts/build-firefox.cjs", { cwd: ROOT, stdio: "pipe" });

  const m = JSON.parse(readFileSync(join(OUT, "manifest.json"), "utf8"));
  ok(m.browser_specific_settings?.gecko?.id === "nounours@nounours.app", "firefox : gecko id");
  ok(m.browser_specific_settings?.gecko?.strict_min_version === "121.0", "firefox : gecko min 121.0");
  ok(!m.browser_specific_settings?.gecko?.id.includes(" "), "firefox : gecko id sans espace");
  ok(!m.permissions?.includes("offscreen"), "firefox : pas de permission offscreen");
  ok(!m.sandbox, "firefox : pas de bloc sandbox");

  for (const f of REQUIRED_FILES) {
    ok(existsSync(join(OUT, f)), "firefox : présent " + f);
  }

  const zip = join(ROOT, "dist", `nounours-firefox-${m.version}.zip`);
  ok(existsSync(zip), "firefox : zip dist/nounours-firefox-" + m.version + ".zip");
  ok(readFileSync(zip).length > 10000, "firefox : zip non vide");

  // pas de fichier racine oublié (hors dist/)
  const built = new Set(
    REQUIRED_FILES.map((f) => f.split("/")[0]).filter((x, i, a) => a.indexOf(x) === i)
  );
  ok(built.has("icons"), "firefox : dossier icons copié");
  ok(readdirSync(join(OUT, "icons")).length >= 3, "firefox : icons peuplé");
  // l'IA est retirée de cette release : aucun vendor/ ML ni fichier offscreen/sandbox.
  ok(!existsSync(join(OUT, "vendor")), "firefox : pas de dossier vendor (IA retirée)");
  ok(!existsSync(join(OUT, "offscreen.js")) && !existsSync(join(OUT, "sandbox.js")), "firefox : pas de fichiers IA (offscreen/sandbox)");
}