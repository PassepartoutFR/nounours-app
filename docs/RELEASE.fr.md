# Du patch au produit — comment une correction arrive chez les utilisateurs 🧸

**🇬🇧 English version → [RELEASE.en.md](RELEASE.en.md)** · **🏠 Hub bilingue → [RELEASE.md](RELEASE.md)**

L'objectif : que **corriger un bug = quelques secondes de ta part**, et que le
reste (build, publication, mise à jour des utilisateurs) se fasse **tout seul**.

## L'idée en une phrase

> La **version** dans `manifest.json` est la source de vérité. Un **tag git**
> `vX.Y.Z` déclenche toute la chaîne. Les utilisateurs se mettent à jour seuls.

## La cérémonie de release (le rêve)

```bash
# 1. tu corriges le code, tu vérifies (demo.html / node --check)
# 2. une seule commande :
scripts/release.sh 0.5.1
```

`release.sh` bumpe la version dans `manifest.json`, commit, crée le tag `v0.5.1`
et le pousse. À partir de là, **GitHub Actions** prend le relais (voir
`.github/workflows/release.yml`) :

1. construit `nounours-app-0.5.1.zip` ;
2. crée la **Release GitHub** (avec notes auto) ;
3. **publie sur le Chrome Web Store** (si les secrets sont configurés).

Puis **Chrome met à jour automatiquement** tous les utilisateurs installés
(généralement en quelques heures, max ~1 jour). Tu n'as rien d'autre à faire.

## Par surface

| Surface | Comment le patch arrive | Auto ? |
|---|---|---|
| **Extension (Chrome)** | tag → CI build + publie via l'API Web Store → Chrome auto-update les utilisateurs | ✅ une fois configuré |
| **Edge** | même `.zip`, API Edge Add-ons | ⚙️ à brancher |
| **Firefox** | `web-ext sign` / API AMO (petites adaptations) | ⚙️ à brancher |
| **Site nounours.app** | `scripts/deploy-site.sh` (1 commande) | 🖐️ manuel instantané |
| **Serveur classement** | `scripts/deploy-server.sh` (copie + restart) | 🖐️ manuel instantané |

> Pourquoi le site/serveur restent en commande manuelle ? Ils vivent sur un hôte
> de production : un déploiement à 1 commande, traçable, est plus sûr qu'un
> auto-push. (On peut les passer en GitHub Action *manuelle* plus tard si besoin.)

## Activer la publication automatique de l'extension

La **toute première** publication se fait à la main (dashboard) — il faut
récupérer l'**ID de l'extension**. Ensuite, tout est automatique.

1. Crée le projet sur https://chrome.google.com/webstore/devconsole (5 $ une fois),
   upload `nounours-app-X.Y.Z.zip`, note l'**ID de l'extension**.
2. Crée des identifiants OAuth (Google Cloud Console → API « Chrome Web Store ») :
   `client_id`, `client_secret`, et un `refresh_token` (procédure : doc de
   l'action `mnao305/chrome-extension-upload`).
3. Dans le dépôt GitHub → *Settings → Secrets and variables → Actions*, ajoute :
   - `CHROME_EXTENSION_ID`
   - `CHROME_CLIENT_ID`
   - `CHROME_CLIENT_SECRET`
   - `CHROME_REFRESH_TOKEN`

Tant que ces secrets ne sont pas là, l'étape de publication est **sautée**
proprement (le build + la Release GitHub marchent quand même).

## Déployer le site / le serveur

Aucun secret ni adresse dans le dépôt : l'hôte passe par une variable d'env.

```bash
export DEPLOY_HOST="utilisateur@ton-serveur"     # requis
export DEPLOY_WEBROOT="/var/www/nounours"        # optionnel (défaut)

scripts/deploy-site.sh      # pousse site/ -> le serveur web
scripts/deploy-server.sh    # pousse server/server.py + restart du service
```

## Versionnement

- **SemVer** : `MAJEUR.MINEUR.PATCH`.
  - PATCH (0.5.**1**) : corrections, nouvelles langues/répliques.
  - MINEUR (0.**6**.0) : nouvelles fonctionnalités compatibles.
  - MAJEUR (**1**.0.0) : changement qui casse la compatibilité.
- La version de `manifest.json` **doit** monter à chaque publication store
  (Chrome refuse un upload avec une version égale ou inférieure).

## Rollback

- **Extension** : republie la version précédente (re-tag) — Chrome redescend les
  utilisateurs à cette version au prochain cycle de mise à jour.
- **Site** : `git checkout <tag précédent> -- site && scripts/deploy-site.sh`.
- **Serveur** : `git checkout <tag> -- server && scripts/deploy-server.sh`.

## Checklist avant un tag

- [ ] `node --check` sur les `.js` touchés
- [ ] testé dans `demo.html` (moteur) et/ou `test.html` (extension)
- [ ] version bumpée (le fait `release.sh`)
- [ ] CHANGELOG / notes (les notes GitHub sont auto-générées des commits)
