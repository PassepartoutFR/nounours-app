# White Paper — A Kinder Web 🧸

*Kindness as a weapon of mass de-escalation against trolls.*

**Version 1.0 — June 2026** · [nounours.app](https://nounours.app) · MIT License

> French original: [LIVRE-BLANC.md](LIVRE-BLANC.md)

---

## Abstract

The internet has a meanness problem, and the usual answers don't work:
moderation feels like censorship, moralizing backfires, and banning fuels an
endless cat-and-mouse game.

**A Kinder Web** ("Un web de gentil") takes the problem from the other end: it
doesn't fight toxicity, it **ridicules it with tenderness**. When a troll spits
venom, the extension replaces it — *in the browser of whoever is reading* — with
an adorably cheeky mascot: a teddy, a kitten, a sweet granny, Bob Ross. Poison
goes in, cuddly nonsense comes out. We **troll the troll, with a hug**.

This document lays out the vision, the non-negotiable principles, what the
product is **not**, and how it sustains itself over time.

---

## 1. The problem

Online toxicity is real and costly (mental health, people fleeing public spaces,
self-censorship). But the dominant tools share three blind spots:

1. **Moderation feels like censorship.** Deleting a message proves the troll
   right ("I'm being silenced") and just moves the fight elsewhere.
2. **Moralizing is ineffective.** "Hate is bad" has never disarmed anyone; it
   hardens positions.
3. **Banning is an endless game.** New account, new venom. You treat the symptom,
   never the experience of the person receiving it.

The shared blind spot: all of these act **on the troll**. Nobody protects, first,
**the experience of the person reading**.

## 2. The thesis

> You don't beat meanness by being harsher. You win by making it **laughable and
> harmless**.

Our bet: **humor disarms what severity inflames.** A troll who gets answered by a
teddy bear congratulating them on their bravery-behind-a-screen has no grip left.
Their cruelty becomes a joke — ours, not theirs.

And crucially: the change happens **on the reader's side**, locally, instantly,
asking no one for permission. No platform to convince, no account to create, no
troll to ban. Just a web that, on your screen, becomes a little softer.

## 3. Founding principles (non-negotiable)

These are the red lines. A change that breaks one doesn't ship.

- **Privacy by design.** Filtering is 100% local. The content you read, the
  pages, the URLs: nothing leaves your machine. Ever.
- **Opt-in for anything that leaves.** The only data that can leave (your
  leaderboard score) leaves only if you turn it on — and it's a nickname plus a
  number, full stop.
- **Free forever.** No subscription, no "premium", no catch. Kindness isn't
  rented.
- **Open source.** The code is the trust. Everything is verifiable (MIT).
- **The user stays in control.** We never write on your behalf. The "Kind
  Mirror" *offers* a softer version of **your** draft; you decide.
- **Multilingual.** Kindness has no borders. We detect and reply in the troll's
  own language.
- **Funny first, never preachy.** If it lectures, it failed.

## 4. What it is NOT (anti-goals)

As important as the vision: refusing the slippery slopes.

- **Not a moderation or censorship tool.** We delete nothing on platform servers;
  we soften the *display*, on the reader's side, reversibly (one click reveals
  the original).
- **Not surveillance.** No collection of behavior, history, or profiles. No
  tracking cookies, no ads, no resale.
- **Not a judge of truth.** Detection is a **light, fallible heuristic**
  (word lists), owned as such. It will be wrong sometimes — which is exactly why
  everything is reversible and nothing is permanent.
- **Not a weapon against people.** We mock *meanness*, not individuals. The tone
  stays tender, never hateful in return.

## 5. The product

Five pillars, all reversible, all local (except the opt-in leaderboard):

| Pillar | Idea |
|---|---|
| **Local multilingual detection** | 7 languages, in the browser, zero network. |
| **Mascots & intensity** | Pick your voice (teddy/kitten/granny/Bob Ross) and your tone (soft → hardcore, always kind). |
| **Sprinkled hearts** | Wherever it filtered, hearts grow. Your feed becomes a garden. |
| **Kind Mirror** | Before *you* post something harsh, it offers a gentler version. |
| **Account-less leaderboard** | An anonymous identity lives in the extension. The more you soften, the higher you climb. Opt-in. |

## 6. Sustainability

A free, private product makes people wonder: "if it's free, you're the product."
Not here, and here's why it's tenable:

- **Costs are near zero.** All the work happens on the user's machine (no
  server-side compute, no API bills). The only online service, the leaderboard,
  is a tiny dependency-free server whose marginal cost is negligible.
- **We don't monetize data — by principle, not by default.** There's nothing to
  sell: we collect nothing.
- **Funding possible, never at the user's expense:** donations / open-source
  sponsors. Never ads, never resale, never a paywall on kindness.

The value created isn't ARPU. It's a **shift in norms**: showing that you can
answer toxicity with something other than severity.

## 7. Governance & community

- **MIT License**, fully public code.
- **Contributions welcome**, especially: new languages, funnier lines, browser
  ports. Everything goes through public PRs.
- **Transparency**: no hidden features, no quiet telemetry. What the extension
  does is readable in the code.

## 8. Horizon

No date promises — directions:

- **Edge / Firefox / Safari** ports (same spirit, everywhere).
- More **languages** and **mascots** (community-driven).
- **Identity export / import** (never lose your score).
- A possible **public "kindness" API** (reuse the engine elsewhere).
- **Community themes** (everyone's own way of being kind).

## 9. How we measure success

Not time spent, not clicks, not engagement. In:

- **trolls hugged** (the only counter that matters);
- **smiles** triggered;
- and, in time, **an idea that spreads**: online meanness can be defused — and it
  can even be funny.

---

## Manifesto

> The web doesn't need more gatekeepers.
> It needs more **teddy bears**.
>
> We won't silence the trolls. We'll make them **adorable in spite of themselves**.
> We won't lecture. We'll make people **smile**.
> And where others build a wall, we'll put a **hug**.
>
> Make the web a little more cuddly. 🧸
