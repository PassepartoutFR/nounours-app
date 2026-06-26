# Changelog

**🇫🇷 Version française → [CHANGELOG.fr.md](CHANGELOG.fr.md)** · **🏠 Hub → [CHANGELOG.md](CHANGELOG.md)**

Notable versions. SemVer; format inspired by *Keep a Changelog*.

## [0.7.4] — 2026-06-26

### Fixed
- 🔧 **CSP**: the `connect-src` added in 0.7.3 (to load the AI model) mistakenly
  blocked the **leaderboard** calls (`nounours.app/api`). Re-allowed `nounours.app`
  + localhost. (Regression from 0.7.3.)

## [0.7.3] — 2026-06-26

### Added
- 🧠 **Local AI (experimental)** — popup option, **off by default**. A small
  toxicity model runs **100% in your browser** (off-page, in an *offscreen
  document*) and **understands meaning**: it softens veiled insults the word
  lists miss ("What a stupid moro" → softened). **Hybrid**: the word list decides
  the obvious cases in 0 ms; the AI is only called on the **gray zone** (a harsh
  word with no clear target). ~25 MB model downloaded once, then cached.
  **Fail-safe**: any AI error silently falls back to the word lists (no breakage);
  TF.js libs are **vendored** (no remote code), only model data loads at runtime.

## [0.7.2] — 2026-06-26

### Added
- 🎚️ **Detection sensitivity setting** (popup): **Precise** (default — real
  attacks only, zero false positives) or **Broad** (also softens lone harsh
  words like "dumb" / "stupid" without requiring a target — many more catches,
  a few accepted false positives). Stays **language-scoped**.

## [0.7.1] — 2026-06-26 (beta testable on GitHub)

> 0.7.1 = first published build (tag 0.7.0 had failed CI release:
> nonexistent `chrome-extension-upload@v5` action). Same content as 0.7.0.

### Added
- 🎯 **Redesigned detection — far fewer false positives**: engine overhaul
  (expert panel, 8 languages). **Two-level** lexicons — always-attack insults vs
  **contextual** words that trigger ONLY when **targeting a person**
  ("that's stupid / I'm starving / das ist dumm" no longer softened);
  **language scoping** (no more cross-language hits: `idiota`, `loser`, `dom`…);
  fixed `norm` (collapse 3+ not 2+, intra-word leetspeak, Polish `ł` fix).
  Validated on **213-phrase corpus** (`test/corpus.json`): **0 false positives
  (100% precision)**, **96% recall** on real attacks.
- 🗑️ **Self-service leaderboard deletion**: no email needed — temporary `DEL1`
  code (15 min) from the popup or direct deletion; privacy page form
  (`POST /api/account/delete`).
- 🌟 **Legendary Teddy**: ~1 in 25 mean comments triggers a **golden shiny**
  reply (rare, stable per text, multilingual).
- 🛡️ **Anti-obfuscation detection**: recognizes *leetspeak* (`c0nnard`, `5tupid`,
  `d3gage`) and **repeated letters** (`saloooope`), without over-detecting normal text.
- 📊 **Table of the Kind** (site): live dashboard on nounours.app — visitors
  present now, visits today/total (14-day sparkline), equipped accounts and
  softened meannesses. **Full privacy respect**: ephemeral session id, RAM-only
  presence, aggregated counters, **zero cookies, zero tracking, no IP stored**
  (anti-inflation per IP). Translated in 7 languages, privacy page updated.
- 🏅 **Achievements & badges**: 10 unlockable badges (First hug, Centurion,
  Polyglot, Tower of Babel, Legendary Teddy hunter…), shown in the popup. Local
  tracking of crossed languages and legendaries seen.
- 🔥 **Daily streaks**: **consecutive days** of softening the web
  (UTC day, +1 if consecutive, reset after a gap) + 2 streak badges.
- 🖼️ **Shareable social card**: one-click image (nickname, rank, level, streak,
  badges) ready to post, from the popup.
- 🇵🇱 **Polish**: 8th language — detection AND mascot replies in Polish.
- 🖍️ **"Highlight without replacing" mode**: mark the comment (faded original +
  underline) and reveal the mascot on click.
- 📄 **English README** (`README.en.md`) + **FAQ** (`docs/FAQ.md`) for open source.
- 🛠️ **Admin panel** (`site/admin.html`): server health, stats and **leaderboard
  moderation** (remove an entry), protected by **env key**
  (`NOUNOURS_ADMIN_KEY`, never committed; admin disabled if absent). Endpoints
  `/admin/overview|scores|delete` on both twin servers (Node + Python).
- 🚩 **"Not mean" report** (false positive): discreet flag on each softened message
  to report a false detection — sends **ONLY the language code** (never text or URL).
  Aggregated counter per language, visible in admin.
- 🛡️ **Teams / guilds** (opt-in): join a team with a **free-form code**;
  your hugs add up → **team leaderboard**. No personal data (just the code).
- 🌍 **Live global counter** (site): large animated "X trolls hugged" on the home
  page, refreshed live, sparkle at round milestones.
- ☀️ **Kindness weather** (site): mood of the day from aggregated stats
  ("sunny hug · 92% sweetness"), translated, **100% client-side**.
- 🔄 **Remotely editable detection lists** (opt-in, **OFF by default**): maintainer
  adjusts detected words / replies from admin (key), served as JSON; extension stays
  **100% local by default** and, if enabled, merges lists (data only, never code,
  capped, safe fallback to built-in).
- 🌍 **Kindness heat map** (site): where kindness comes from, by **browser language
  (approximate, never IP)**, aggregated, translated, honest.

## [0.6.0] — unreleased
### Added
- 💾 **Identity export/import**: back up / restore your account (`UWG1` code)
  so you never lose your score, even after reinstalling.
- 🌐 **Edge** support (same package) and **Firefox** (`scripts/build-firefox.cjs`).
- 📖 White paper in **English**.
- 🧪 Unit **test** harness + CI.

## [0.5.0] — submitted to Chrome Web Store (2026-06-26)
### Added
- First public version: local multilingual detection (**7 languages**),
  mascots (teddy / kittens / granny / Bob Ross), intensity
  (soft / medium / hardcore), **animated hearts**, **Kind Mirror**,
  **"account without account" leaderboard**.
- **nounours.app** multilingual site + privacy page.