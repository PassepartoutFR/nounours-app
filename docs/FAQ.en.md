# ❓ FAQ — A Kinder Web 🧸

**🇫🇷 Version française → [FAQ.fr.md](FAQ.fr.md)** · **🏠 Hub → [FAQ.md](FAQ.md)**

Short answers to the questions we get most often.

## Do you read my comments?

**No.** Filtering is 100% **local**: everything happens in your browser, on your
machine. No comment, page, or URL ever leaves your screen. There simply is no
server that sees what you read.

## Which sites does it work on?

**Any web page**: social networks, forums, comment sections… The extension reads
displayed text and softens what looks mean, wherever you are. You can always
**click** a softened message to reveal the original.

## Is it really free, forever?

**Yes.** No subscription, no "premium", no trap. Kindness isn't for rent. Costs
are near zero (everything runs on your machine), so there's no pressure to charge
you. If funding ever happens, it'll be through donations or open-source sponsors —
**never** ads, never data resale, never a paywall on kindness.

## How do you detect meanness?

With a **light, fallible heuristic**: word lists per language. This is **not**
context understanding — deliberately simple. Text is normalized (lowercase,
accent-stripped) then compared to lists. False positives happen; that's why
**everything is reversible** and nothing is permanent.

## What about false positives?

It happens — e.g. "I'm not an idiot" may still get softened because there's no
context analysis. No panic: **click the softened message to reveal the original**.
Nothing is deleted, nothing is permanent: we only change **display**, on your
side, and it's always undoable.

## Is the leaderboard anonymous?

**Yes.** It's **off by default**. If you choose to join, the extension generates an
**anonymous identity** (an id + a secret key): no email, no password. We only send
`{anonymous id, nickname, score}` — **never** your comments or the sites you visit.

## Will the Kind Mirror post for me?

Never. Before **you** send a harsh message, the Mirror **offers** a gentler version
of **your** draft. You always keep control: you can "send anyway". We never write
on your behalf.

## Can I contribute a language?

**Yes, and it's welcome!** Everything lives in `uwg-core.js`: add your language in
`LEX` (detected words), in each `BANKS` theme (mascot lines), and in `SOFT` /
`SAVAGE` / `HINT`. That's it. Then open a **PR** — contributions go through public
pull requests. New mascots and funnier lines are welcome too.

## How do I keep my score?

Your identity (and score) lives in the extension. **Export / import identity**
lets you back up and restore — handy when switching machines or browsers without
starting over.

## How do I delete my leaderboard entry?

**Self-service, no email.** From the popup: "Delete from server" (direct) or
"Deletion code" (`DEL1`, valid 15 minutes) to paste on
[nounours.app/privacy.html](https://nounours.app/privacy.html). The code proves you
own the account without exposing your secret key.

## Is this moderation or censorship?

**No.** We don't delete anything on platform servers: we soften **display**, on
your side, **reversibly** (one click reveals the original). We mock **meanness**,
not people — the tone stays tender, never hateful in return.