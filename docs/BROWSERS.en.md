# Multi-browser — Chrome, Edge, Firefox 🧸

**🇫🇷 Version française → [BROWSERS.fr.md](BROWSERS.fr.md)** · **🏠 Hub → [BROWSERS.md](BROWSERS.md)**

The extension uses standard **Manifest V3**, so it's highly portable. Engine,
site, and server are identical everywhere.

## Chrome / Brave (reference)
The package as-is. `nounours-app-X.Y.Z.zip` (see [RELEASE.en.md](RELEASE.en.md)).
Already submitted to the **Chrome Web Store**. Brave uses the same store.

## Edge — free, almost nothing to do
**The same `.zip`** works on Edge (identical MV3).
1. **Microsoft Edge Add-ons** developer account (https://partner.microsoft.com/dashboard/microsoftedge) — **free**, no fee.
2. "Create extension" → upload the **same zip** as Chrome.
3. Reuse the listing from [`deploy/STORE-LISTING.md`](../deploy/STORE-LISTING.md)
   (description, screenshots, privacy, `https://nounours.app/privacy.html`).

## Firefox — build ready
Firefox needs `browser_specific_settings` (a gecko id) and targets
**Firefox 121+** (MV3 service worker support). The script copies **all**
Chrome package files (offscreen, sandbox, local AI vendor, etc.).

```bash
node scripts/build-firefox.cjs
# -> dist/firefox/          (folder for dev loading)
# -> dist/nounours-firefox-X.Y.Z.zip   (attached to GitHub Releases on tag vX.Y.Z)
```

**Test without AMO**: `about:debugging` → "This Firefox" → "Load Temporary Add-on"
→ `dist/firefox/manifest.json`.

**Publish on AMO** (free, signing required outside dev mode):

```bash
npx web-ext sign -s dist/firefox --api-key ... --api-secret ...
```

- Code uses the `chrome.*` namespace, which Firefox supports natively —
  no rewrite needed.
- Gecko id: `nounours@nounours.app` (changeable in `scripts/build-firefox.cjs`).
- Ready-to-download zip: GitHub **Releases** tab (`nounours-firefox-X.Y.Z.zip`).

## Safari — optional
Safari requires **wrapping** the extension via Xcode (`xcrun safari-web-extension-converter`)
and an **Apple Developer account ($99/year)**. Only consider if demand exists.

## Cost recap
| Store | Fee |
|---|---|
| Chrome Web Store | $5 once |
| Edge Add-ons | free |
| Firefox AMO | free |
| Safari | $99/year (Apple Developer) |