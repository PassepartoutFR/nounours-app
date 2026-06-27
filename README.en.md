# 🧸 A Kinder Web

**🇫🇷 Version française → [README.fr.md](README.fr.md)** · **🏠 Bilingual hub → [README.md](README.md)**

A browser extension (Chromium / **Brave** / Chrome / Edge) that **replaces mean
comments with cheeky, ironic troll mascot messages**.

**🌍 [nounours.app](https://nounours.app) · MIT License · Free forever**

> ### ⬇️ Try the beta now (free, no store wait)
> **[Download the latest `.zip`](https://github.com/PassepartoutFR/nounours-app/releases/latest)** → unzip → load in *developer mode* (see [Install](#install-developer-mode-30-s)). Works on Brave / Chrome / Edge. *(Chrome Web Store submission in progress.)*

📖 White paper ([EN](docs/WHITE-PAPER.md) · [FR](docs/LIVRE-BLANC.md)) · 🌐 [Multi-browser](docs/BROWSERS.md) · 🚀 [Releases](docs/RELEASE.md) · 🤝 [Contribute](CONTRIBUTING.md) · ❓ [FAQ](docs/FAQ.md)

**Multilingual (8 languages)**: FR, EN, ES, IT, DE, PT, NL, PL. Both detection **and**
the reply happen in the comment's language — a Spanish troll gets answered in
Spanish, a German one in German. (The page language, `<html lang>`, takes priority
to disambiguate words shared across languages, like "idiot".)

**Filtering** is 100% **local**: no network request, nothing leaves your page.
Only the **leaderboard** (below) is opt-in and sends a strict minimum.

## The idea: troll the troll, with a hug

The internet has a meanness problem, and the usual answers don't work:
moderation feels like censorship, moralizing backfires, and banning just fuels an
endless cat-and-mouse game.

**A Kinder Web** takes the problem from the other end. It doesn't fight toxicity,
it **ridicules it with tenderness**. When a troll spits venom, the extension
replaces it — *in the browser of whoever is reading* — with an adorably cheeky
mascot: teddy, kitten, sweet granny, Bob Ross. Poison goes in, cuddly nonsense
comes out. We **troll the troll, with a hug**.

## What it can do

- 🎭 **Mascots (themes)**: Teddy 🧸 · Kittens 🐱 · Granny 👵 · Bob Ross 🎨.
- 🎚️ **Intensity**: *Soft* (pure comfort) · *Medium* · *Hardcore* (a final little jab).
- 💕 **Sprinkled hearts**: animated hearts linger around every filtered spot.
- 🪞 **Kind Mirror**: before *you* post something harsh, it offers a gentler
  version (you can always "send anyway").
- 🖱️ **Click** a softened message → reveals the original.
- 🏆 **Worldwide leaderboard** (opt-in): "account without an account", anonymous, free.
- 🏅 **Badges & titles**: *Cuddle Apprentice → Cuddle Master → Honey Legend*.
- 🔥 **Daily streaks**: consecutive days of softening the web.
- 🖼️ **Shareable card**: image of your rank/badges ready to post.
- 🌟 **Legendary Teddy**: rare golden easter egg on nasty insults.
- 🖍️ **Highlight mode**: mark without replacing, reveal on click.
- 🗑️ **Self-service deletion**: remove your leaderboard entry without email (`DEL1` code).

## Architecture (files)

| File | Role |
|---|---|
| `uwg-core.js` | **Shared core**: per-language word lists, banks by theme/intensity, detection, levels. |
| `content.js` | Replaces page comments + confetti + levels. |
| `mirror.js` | Kind Mirror (checks your own drafts). |
| `background.js` | "Hugs counter" badge per tab + leaderboard sync. |
| `popup.html/js` | Settings: theme, intensity, hearts, mirror, level, leaderboard. |
| `scoreboard.js` | "Account without an account": anonymous identity + server dialogue. |
| `server/server.py` | Leaderboard server (Python, production) · `server.js` = Node twin (tests). |
| `site/` | Multilingual landing at [nounours.app](https://nounours.app). |
| `demo.html` | Standalone playground (no extension). |
| `test.html` | Fake social-media page to test the extension. |

## Install (developer mode, ~30 s)

### 🅰️ Easiest — from a GitHub Release

1. **[Releases](https://github.com/PassepartoutFR/nounours-app/releases/latest)** → download `nounours-app-vX.Y.Z.zip`.
2. Unzip → `nounours-app/` folder.
3. `brave://extensions` (or `chrome://` / `edge://`) → **Developer mode** → **Load unpacked**.
4. Click the 🧸 icon → pick mascot, intensity, go.

### 🅱️ From source (to contribute)

1. Clone the repo → `brave://extensions` → **Developer mode** → **Load unpacked** → this folder.
2. Click the 🧸 icon.

## Try it

- **`demo.html`** → double-click, standalone playground (no extension).
- **`test.html`** → fake comments page + Kind Mirror (extension required).

> ⚠️ For `test.html` as `file://`: `brave://extensions` → details → **Allow access to file URLs**.

## 🏆 Leaderboard (opt-in, account-less)

**Your add-on is your login.** Anonymous identity (`uid` + secret key) generated
locally. No email, no password. Off by default; if you join, we only send
`{anonymous id, nickname, score}` — **never** your comments or URLs.

```bash
node server/server.js   # local → http://127.0.0.1:8790
```

Popup → **Leaderboard** → nickname → **Join**.

**Backup**: export/import identity (`UWG1` code) to switch machines.
**Deletion**: temporary `DEL1` code (15 min) or direct button in the popup;
form at [nounours.app/privacy.en.html](https://nounours.app/privacy.en.html).

## Privacy (non-negotiable)

- **100% local filtering** — nothing leaves your machine for detection.
- **Opt-in leaderboard** — strict minimum only if you choose to join.
- **No surveillance** — zero cookies, zero ads, zero data resale.
- **Open source MIT** — the code is the trust.

## Tweak / tinker (`uwg-core.js`)

- **Detected words**: `LEX` (one list per language).
- **Mascot lines**: `BANKS` (`BANKS.nounours.fr`, `BANKS.chatons.en`…).
- **Intensity**: `SOFT` / `SAVAGE`.
- **Levels**: `LEVELS`.
- **New language**: key in `LEX`, each `BANKS` theme, `SOFT`/`SAVAGE`/`HINT` + `site/i18n.js`.

## Known limits

- **Keyword-based detection**: false positives/negatives owned, no context understanding.
- We replace the **whole text node** containing a mean word.
- The Mirror intercepts **Enter** / *submit*; you always keep the final call.

## Contribute

PRs welcome — languages, funnier lines, browser ports.
See [CONTRIBUTING.md](CONTRIBUTING.md).

> The web doesn't need more gatekeepers. It needs more **teddy bears**. 🧸