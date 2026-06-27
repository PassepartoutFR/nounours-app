# From patch to product — how a fix reaches users 🧸

**🇫🇷 Version française → [RELEASE.fr.md](RELEASE.fr.md)** · **🏠 Hub → [RELEASE.md](RELEASE.md)**

The goal: **fixing a bug = a few seconds of your time**, and the rest (build,
publication, user updates) happens **on its own**.

## The idea in one sentence

> The **version** in `manifest.json` is the source of truth. A git **tag**
> `vX.Y.Z` triggers the whole chain. Users update themselves.

## The release ceremony (the dream)

```bash
# 1. you fix the code, you verify (demo.html / node --check)
# 2. one command:
scripts/release.sh 0.5.1
```

`release.sh` bumps the version in `manifest.json`, commits, creates tag `v0.5.1`
and pushes. From there, **GitHub Actions** takes over (see
`.github/workflows/release.yml`):

1. builds `nounours-app-0.5.1.zip`;
2. creates the **GitHub Release** (with auto notes);
3. **publishes to the Chrome Web Store** (if secrets are configured).

Then **Chrome automatically updates** all installed users
(generally within hours, max ~1 day). Nothing else to do.

## By surface

| Surface | How the patch arrives | Auto? |
|---|---|---|
| **Extension (Chrome)** | tag → CI build + publish via Web Store API → Chrome auto-update | ✅ once configured |
| **Edge** | same `.zip`, Edge Add-ons API | ⚙️ to wire up |
| **Firefox** | `web-ext sign` / AMO API (small adaptations) | ⚙️ to wire up |
| **Site nounours.app** | `scripts/deploy-site.sh` (1 command) | 🖐️ manual instant |
| **Leaderboard server** | `scripts/deploy-server.sh` (copy + restart) | 🖐️ manual instant |

> Why do site/server stay manual? They live on a production host: a 1-command,
> traceable deploy is safer than auto-push. (We can add a *manual* GitHub Action later.)

## Enable automatic extension publishing

The **very first** publication is manual (dashboard) — you need the **extension ID**.
After that, everything is automatic.

1. Create the project on https://chrome.google.com/webstore/devconsole ($5 once),
   upload `nounours-app-X.Y.Z.zip`, note the **extension ID**.
2. Create OAuth credentials (Google Cloud Console → "Chrome Web Store" API):
   `client_id`, `client_secret`, and a `refresh_token`.
3. In the GitHub repo → *Settings → Secrets and variables → Actions*, add:
   - `CHROME_EXTENSION_ID`
   - `CHROME_CLIENT_ID`
   - `CHROME_CLIENT_SECRET`
   - `CHROME_REFRESH_TOKEN`

Quick check:

```bash
node scripts/setup-chrome-publish.cjs   # lists ✅/❌ per secret
```

Until OAuth secrets are set, the publish step is **skipped** cleanly (build +
GitHub Release still work). CI logs which secrets are missing on each tag.

Until those secrets exist, the publish step is **skipped** cleanly
(build + GitHub Release still work).

## Deploy site / server

No secrets or addresses in the repo: host via an environment variable.

```bash
export DEPLOY_HOST="user@your-server"     # required
export DEPLOY_WEBROOT="/var/www/nounours"   # optional (default)

scripts/deploy-site.sh      # pushes site/ -> web server
scripts/deploy-server.sh    # pushes server/server.py + restarts service
```

## Versioning

- **SemVer**: `MAJOR.MINOR.PATCH`.
  - PATCH (0.5.**1**): fixes, new languages/replies.
  - MINOR (0.**6**.0): compatible new features.
  - MAJOR (**1**.0.0): breaking change.
- `manifest.json` version **must** increase on each store publication
  (Chrome rejects upload with equal or lower version).

## Rollback

- **Extension**: republish previous version (re-tag) — Chrome rolls users back on
  next update cycle.
- **Site**: `git checkout <previous tag> -- site && scripts/deploy-site.sh`.
- **Server**: `git checkout <tag> -- server && scripts/deploy-server.sh`.

## Pre-tag checklist

- [ ] `node --check` on touched `.js` files
- [ ] tested in `demo.html` (engine) and/or `test.html` (extension)
- [ ] version bumped (`release.sh` does this)
- [ ] CHANGELOG / notes (GitHub notes auto-generated from commits)