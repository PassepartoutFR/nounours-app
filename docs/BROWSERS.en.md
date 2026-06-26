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

## Firefox — small adaptation
Firefox needs `browser_specific_settings` (a gecko id) and targets
**Firefox 121+** (MV3 service worker support).

```bash
node scripts/build-firefox.cjs       # -> dist/firefox/ (patched manifest)
npx web-ext build -s dist/firefox    # -> zip ready for AMO
# or: npx web-ext sign -s dist/firefox --api-key ... --api-secret ...   (auto-signed)
# or: test live via about:debugging -> "Load Temporary Add-on"
```

- Publish on **addons.mozilla.org (AMO)**: **free**. AMO signing required for
  install outside developer mode.
- Code uses the `chrome.*` namespace, which Firefox supports natively —
  no rewrite needed.
- Default gecko id is `nounours@nounours.app` (changeable in
  `scripts/build-firefox.cjs`).

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