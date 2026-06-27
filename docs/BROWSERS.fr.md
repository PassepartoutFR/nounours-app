# Multi-navigateur — Chrome, Edge, Firefox 🧸

**🇬🇧 English version → [BROWSERS.en.md](BROWSERS.en.md)** · **🏠 Hub bilingue → [BROWSERS.md](BROWSERS.md)**

L'extension est en **Manifest V3** standard, donc très portable. Le moteur, le
site et le serveur sont identiques partout.

## Chrome / Brave (référence)
Le paquet tel quel. `nounours-app-X.Y.Z.zip` (voir [RELEASE.fr.md](RELEASE.fr.md)).
Déjà soumis au **Chrome Web Store**. Brave utilise le même store.

## Edge — gratuit, quasi rien à faire
**Le même `.zip`** marche sur Edge (MV3 identique).
1. Compte développeur **Microsoft Edge Add-ons** (https://partner.microsoft.com/dashboard/microsoftedge) — **gratuit**, pas de frais.
2. « Créer un module complémentaire » → upload le **même zip** que Chrome.
3. Reprends la fiche depuis [`deploy/STORE-LISTING.md`](../deploy/STORE-LISTING.md)
   (description, captures, confidentialité, `https://nounours.app/privacy.html`).

## Firefox — build prêt
Firefox a besoin de `browser_specific_settings` (un identifiant gecko) et cible
**Firefox 121+** (support du service worker MV3). Le script copie **tous** les
fichiers du paquet Chrome (offscreen, sandbox, vendor IA locale, etc.).

```bash
node scripts/build-firefox.cjs
# -> dist/firefox/          (dossier à charger en dev)
# -> dist/nounours-firefox-X.Y.Z.zip   (joint aux Releases GitHub au tag vX.Y.Z)
```

**Tester sans AMO** : `about:debugging` → « Ce Firefox » → « Charger un module
temporaire » → `dist/firefox/manifest.json`.

**Publier sur AMO** (gratuit, signature requise hors mode dev) :

```bash
npx web-ext sign -s dist/firefox --api-key ... --api-secret ...
```

- Le code utilise l'espace de noms `chrome.*`, que Firefox supporte nativement —
  pas de réécriture nécessaire.
- Identifiant gecko : `nounours@nounours.app` (modifiable dans
  `scripts/build-firefox.cjs`).
- Zip prêt à télécharger : onglet **Releases** du repo GitHub
  (`nounours-firefox-X.Y.Z.zip`).

## Safari — optionnel
Safari demande de **wrapper** l'extension via Xcode (`xcrun safari-web-extension-converter`)
et un **compte Apple Developer (99 $/an)**. À envisager seulement si la demande existe.

## Récap coûts
| Store | Frais |
|---|---|
| Chrome Web Store | 5 $ une fois |
| Edge Add-ons | gratuit |
| Firefox AMO | gratuit |
| Safari | 99 $/an (Apple Developer) |
