# Multi-navigateur — Chrome, Edge, Firefox 🧸

L'extension est en **Manifest V3** standard, donc très portable. Le moteur, le
site et le serveur sont identiques partout.

## Chrome / Brave (référence)
Le paquet tel quel. `nounours-app-X.Y.Z.zip` (voir [RELEASE.md](RELEASE.md)).
Déjà soumis au **Chrome Web Store**. Brave utilise le même store.

## Edge — gratuit, quasi rien à faire
**Le même `.zip`** marche sur Edge (MV3 identique).
1. Compte développeur **Microsoft Edge Add-ons** (https://partner.microsoft.com/dashboard/microsoftedge) — **gratuit**, pas de frais.
2. « Créer un module complémentaire » → upload le **même zip** que Chrome.
3. Reprends la fiche depuis [`deploy/STORE-LISTING.md`](../deploy/STORE-LISTING.md)
   (description, captures, confidentialité, `https://nounours.app/privacy.html`).

## Firefox — petite adaptation
Firefox a besoin de `browser_specific_settings` (un identifiant gecko) et cible
**Firefox 121+** (support du service worker MV3).

```bash
node scripts/build-firefox.cjs       # -> dist/firefox/ (manifeste patché)
npx web-ext build -s dist/firefox    # -> un .zip prêt pour AMO
# ou : npx web-ext sign -s dist/firefox --api-key ... --api-secret ...   (auto-signé)
# ou : tester en direct via about:debugging -> "Charger un module temporaire"
```

- Publication sur **addons.mozilla.org (AMO)** : **gratuit**. La signature AMO est
  requise pour une installation hors mode développeur.
- Le code utilise l'espace de noms `chrome.*`, que Firefox supporte nativement —
  pas de réécriture nécessaire.
- L'identifiant gecko par défaut est `nounours@nounours.app` (modifiable dans
  `scripts/build-firefox.cjs`).

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
