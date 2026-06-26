# Contribute to A Kinder Web 🧸

**🇫🇷 Version française → [CONTRIBUTING.fr.md](CONTRIBUTING.fr.md)** · **🏠 Hub → [CONTRIBUTING.md](CONTRIBUTING.md)**

Thanks for helping make the web a little softer! PRs are welcome, especially for:

## 🌍 Add / improve a language
Everything lives in **`uwg-core.js`**:
- `LEX` — detected words, one list per language.
- `BANKS` — mascot lines, by theme then by language.
- `SOFT` / `SAVAGE` — intensity (gentle / hardcore).
- `HINT` — help bubble.

Text is normalized (lowercase, accent-stripped) → no need to handle accents in `LEX`. Add the language key everywhere, and you're done.

The **site** (`site/`) has its own dictionary in `site/i18n.js` (~85 keys × language).

## 😹 Funnier mascot lines
Edit `BANKS` in `uwg-core.js`. Stay **cheeky without being mean**: we troll the troll with kindness, never hate back.

## 🧪 Testing
- `demo.html` (standalone, double-click) for the engine.
- `test.html` (with the extension loaded) for real rendering + Kind Mirror.
- Quick check: `node --check <file>.js`.
- Full suite: `node test/run.mjs`.

## 🎨 Style
- No dependencies, no build for the extension (except the release zip).
- Keep the tone warm, funny, **never preachy**.

## 📦 Architecture (reminder)
- `uwg-core.js` — shared core (detection + replies).
- `content.js` / `mirror.js` / `content.css` — what acts on pages.
- `popup.*` — settings.
- `server/` — leaderboard (Python in prod, Node twin for tests).
- `site/` — nounours.app landing.

No strict rules: open an issue, propose, we'll discuss. 🧸