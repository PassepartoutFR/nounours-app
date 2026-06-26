// Récupère un refresh_token Chrome Web Store API (pour l'auto-publication CI).
// Sans dépendance. Procédure :
//   1. Google Cloud Console -> nouveau projet -> active "Chrome Web Store API".
//   2. Écran de consentement OAuth (External) -> ajoute-toi en utilisateur test.
//   3. Identifiants -> Créer un ID client OAuth -> type "Application de bureau".
//      Récupère le client_id et le client_secret.
//   4. Lance :
//        CHROME_CLIENT_ID=xxx CHROME_CLIENT_SECRET=yyy node tools/get-refresh-token.cjs
//      (ou passe-les en arguments : node tools/get-refresh-token.cjs <client_id> <client_secret>)
//   5. Autorise dans le navigateur -> le refresh_token s'affiche ici.
"use strict";
const http = require("http");
const https = require("https");
const { exec } = require("child_process");

const CLIENT_ID = process.env.CHROME_CLIENT_ID || process.argv[2];
const CLIENT_SECRET = process.env.CHROME_CLIENT_SECRET || process.argv[3];
const PORT = 8976;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/chromewebstore";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Manque CHROME_CLIENT_ID / CHROME_CLIENT_SECRET (env ou arguments).");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/auth?" +
  new URLSearchParams({
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    redirect_uri: REDIRECT,
    client_id: CLIENT_ID,
  }).toString();

function exchange(code) {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT,
    grant_type: "authorization_code",
  }).toString();
  const req = https.request(
    "https://oauth2.googleapis.com/token",
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) } },
    (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        let j;
        try { j = JSON.parse(d); } catch (_) { j = {}; }
        if (j.refresh_token) {
          console.log("\n✅ refresh_token :\n" + j.refresh_token + "\n");
          console.log("Pose les 3 secrets (remplace les valeurs) :");
          console.log('  gh secret set CHROME_CLIENT_ID     --repo PassepartoutFR/nounours-app --body "' + CLIENT_ID + '"');
          console.log('  gh secret set CHROME_CLIENT_SECRET --repo PassepartoutFR/nounours-app --body "<client_secret>"');
          console.log('  gh secret set CHROME_REFRESH_TOKEN --repo PassepartoutFR/nounours-app --body "' + j.refresh_token + '"');
        } else {
          console.error("\n❌ Échec : " + d);
        }
        process.exit(j.refresh_token ? 0 : 1);
      });
    }
  );
  req.on("error", (e) => { console.error(e.message); process.exit(1); });
  req.end(body);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, REDIRECT);
  const code = u.searchParams.get("code");
  if (!code) { res.writeHead(400); return res.end("pas de code"); }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end("<h2>🧸 C'est bon, tu peux fermer cet onglet et revenir au terminal.</h2>");
  server.close();
  exchange(code);
});

server.listen(PORT, () => {
  console.log("Ouvre cette URL dans ton navigateur (connecté au bon compte Google) :\n\n" + authUrl + "\n");
  const cmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
  exec(`${cmd} "${authUrl}"`, () => {});
});
