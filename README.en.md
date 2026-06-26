🇫🇷 Français : [README.md](README.md)

# 🧸 A Kinder Web

A browser extension (Chromium / **Brave** / Chrome / Edge) that **replaces mean
comments with messages from cheeky, ironic troll mascots**.

**🌍 [nounours.app](https://nounours.app) · MIT License · Free forever · Coming soon to the Chrome Web Store**

📖 White paper ([EN](docs/WHITE-PAPER.md) · [FR](docs/LIVRE-BLANC.md)) · 🌐 [Multi-browser](docs/BROWSERS.md) · 🚀 [Releases](docs/RELEASE.md) · 🤝 [Contribute](CONTRIBUTING.md) · ❓ [FAQ](docs/FAQ.md)

## The idea: troll the troll, with a hug

The internet has a meanness problem, and the usual answers don't work:
moderation feels like censorship, moralizing backfires, and banning just fuels an
endless cat-and-mouse game.

**A Kinder Web** takes the problem from the other end. It doesn't fight toxicity,
it **ridicules it with tenderness**. When a troll spits venom, the extension
replaces it — *in the browser of whoever is reading* — with an adorably cheeky
mascot: a teddy, a kitten, a sweet granny, Bob Ross. Poison goes in, cuddly
nonsense comes out. We **troll the troll, with a hug**.

And crucially, the change happens **on the reader's side**, locally, instantly,
asking no one for permission. No platform to convince, no account to create, no
troll to ban — just a web that, on your screen, becomes a little softer.

**Multilingual (7 languages)**: FR, EN, ES, IT, DE, PT, NL. Both detection **and**
the reply happen in the language of the comment — a Spanish troll gets answered
in Spanish, a German one in German. (The page language, `<html lang>`, takes
priority to disambiguate words shared across languages, like "idiot".)

The **filtering** is 100% **local**: no network request, nothing leaves your
page. Only the **leaderboard** (below) is opt-in, and it sends a strict minimum.

## What it can do

- 🎭 **Mascots (themes)**: Teddy 🧸 · Kittens 🐱 · Granny 👵 · Bob Ross 🎨.
- 🎚️ **Intensity**: *Soft* (pure comfort) · *Medium* · *Hardcore* (a final little jab).
- 💕 **Sprinkled hearts**: animated hearts linger around every spot that got filtered — your feed becomes a garden.
- 🪞 **Kind Mirror**: before *you* post something harsh, it offers you a gentler
  version (you can always "send anyway"). We never write on your behalf — you decide.
- 🖱️ **Click** a softened message → reveals the original. Everything is reversible.
- 🏆 **Leaderboard**: an opt-in "account without an account" — an anonymous identity
  lives in the extension, and the more trolls you hug, the higher you climb (see below).
- 🎖️ **Badges & rising titles**: *Cuddle Apprentice → Cuddle Master → Honey Legend*.
- 🔥 **Daily streaks**: keep softening day after day and watch your streak grow.
- 🃏 **Shareable card**: show off your stats and titles with a card built to share.
- ✨ **The golden Legendary Teddy easter egg**: a rare, extra-nasty insult unlocks a
  special golden "legendary" mascot. Keep an eye out.

## How it's built (files)

| File | Role |
|---|---|
| `uwg-core.js` | **Shared core**: per-language word lists, banks by theme/intensity, detection, levels. Used by the extension **and** the playground. |
| `content.js` | Replaces the page's comments + confetti + levels. |
| `mirror.js` | The Kind Mirror (checks your own drafts). |
| `background.js` | "Hugs counter" badge per tab + leaderboard sync. |
| `popup.html/js` | Settings: theme, intensity, hearts, mirror, level, leaderboard. |
| `scoreboard.js` | "Account without an account": anonymous identity + server dialogue. |
| `server/server.js` | Leaderboard server (Node, zero dependencies). |
| `content.css` | Styles (badge, hearts, toast, mirror). |
| `test.html` | Fake social-media page to test the extension. |
| `demo.html` | **Standalone playground** (no extension) — see below. |

## Install (developer mode, ~30 s)

> The extension is **coming to the Chrome Web Store**. For now, load it in
> developer mode:

1. Open `brave://extensions` (or `chrome://extensions`).
2. Turn on **Developer mode** (top-right corner).
3. **Load unpacked** → choose this folder (`web-de-gentil`).
4. Click the 🧸 icon → pick your mascot, your intensity, and so on.

## Try it

- **Easiest: `demo.html`** → double-click the file. It's a **standalone playground**
  (it loads `uwg-core.js` as a `<script>`, so no extension or server needed): type
  a comment, switch theme/intensity, watch the transformation live.
- **The extension: `test.html`** → a fake comments page (FR/EN/ES/IT/DE/PT/NL,
  static + dynamic) plus a composer to try out the **Kind Mirror**.

> ⚠️ For the extension to act on `test.html` opened as `file://`, go to
> `brave://extensions` → details for "A Kinder Web" → enable **Allow access to
> file URLs**. (`demo.html` works without enabling anything.)

## 🏆 Leaderboard (opt-in, account-less, free forever)

The idea: **your add-on is your login**. On first use, the extension generates an
**anonymous identity** (a `uid` + a secret key) that lives inside the extension.
No email, no password. You pick a nickname, and your tally of hugged trolls
climbs a worldwide leaderboard.

**Privacy**: it's **off by default**. If you join in, we only send
`{anonymous id, nickname, score}` — **never** your comments, never the URLs you
visit. The filtering itself stays 100% local.

**Run the server** (locally, to test):

```bash
node server/server.js        # → http://127.0.0.1:8790   (or: npm run server)
```

Then in the popup → **Leaderboard** → enter a nickname → **Join**. Your rank and
the top 10 appear. Open a second "identity" (another browser profile) to see
several players.

**Anti-cheat (light, honor system)**: score is **monotone** (never goes down), a
cap on the per-submission increase, and a **token** per `uid` (= `HMAC(secret,
uid)`, TOFU) → nobody can overwrite someone else's score. It's spoofable by anyone
who really wants to (anonymous client), and that's owned as such: it's for fun.

## Privacy stance

Privacy is a non-negotiable red line, not a feature:

- **Filtering is 100% local.** The content you read, the pages, the URLs: nothing
  leaves your machine. Ever.
- **Opt-in for anything that leaves.** The only data that can leave is your
  leaderboard score — and only if you turn it on. It's an anonymous id, a nickname,
  and a number, full stop.
- **No surveillance.** No behavior collection, no history, no profiles. No tracking
  cookies, no ads, no resale.
- **The user stays in control.** We never post on your behalf; the Kind Mirror only
  *offers* a softer version of **your** draft, and every change is reversible.
- **Open source.** The code is the trust — everything is verifiable (MIT).

## Tweak / tinker (it's all in `uwg-core.js`)

- **Detected words**: the `LEX` object (one list per language). Text is normalized
  (lowercased, accent-stripped) → no need to handle accents in the lists.
- **Mascot lines**: the `BANKS` object (`BANKS.nounours.fr`, `BANKS.chatons.en`…).
- **Intensity**: `SOFT` (gentle) and `SAVAGE` (hardcore jabs).
- **Levels**: `LEVELS`.
- **Add a language**: add the key in `LEX`, in each theme of `BANKS`, and in
  `SOFT`/`SAVAGE`/`HINT`. That's it.
- **Add a mascot**: add an entry in `BANKS` plus one in `THEMES`.

## Known limits (proto)

- **Keyword-based detection**: false positives/negatives are owned. No context
  understanding ("I'm not an idiot" still gets softened). A possible next step: a
  local toxicity model (ONNX) — at the cost of more weight, but keeping the
  "100% local" promise.
- We replace the **whole text node** containing a mean word.
- The Mirror intercepts sending on **Enter** / *submit* in editable fields; it
  always leaves you the final call ("send anyway").

## Learn more & contribute

- 📖 Read the **[white paper](docs/WHITE-PAPER.md)** for the full vision, the
  non-negotiable principles, and what the product is deliberately *not*.
- ❓ Check the **[FAQ](docs/FAQ.md)** for quick answers.
- 🤝 **[Contributions welcome](CONTRIBUTING.md)** — especially new languages, funnier
  lines, and browser ports. Everything goes through public PRs.

> The web doesn't need more gatekeepers. It needs more **teddy bears**. 🧸
