# 🧸 Un web de gentil

**🇬🇧 English version → [README.en.md](README.en.md)** · **🏠 Hub bilingue → [README.md](README.md)**

Extension navigateur (Chromium / **Brave** / Chrome / Edge) qui **remplace les
commentaires méchants par des messages de mascottes** trolls et ironiques.

**🌍 [nounours.app](https://nounours.app) · Licence MIT · Gratuit à vie**

> ### ⬇️ Tester la bêta maintenant (gratuit, sans attendre le store)
> **[Télécharge le dernier `.zip`](https://github.com/PassepartoutFR/nounours-app/releases/latest)** → décompresse → charge-le en *mode développeur* (voir [Installer](#installer-mode-développeur-30-s)). Marche sur Brave / Chrome / Edge. *(Soumission Chrome Web Store en cours en parallèle.)*

📖 Livre blanc ([FR](docs/LIVRE-BLANC.md) · [EN](docs/WHITE-PAPER.md)) · 🌐 [Multi-navigateur](docs/BROWSERS.md) · 🚀 [Releases](docs/RELEASE.md) · 🤝 [Contribuer](CONTRIBUTING.md) · ❓ [FAQ](docs/FAQ.md)

**Multilingue (8 langues)** : FR, EN, ES, IT, DE, PT, NL, PL. La détection ET la
réponse se font dans la langue du commentaire — un troll espagnol se fait
répondre en espagnol, un allemand en allemand. (La langue de la page,
`<html lang>`, est prioritaire pour lever l'ambiguïté des mots partagés comme
« idiot ».)

Le **filtrage** est 100 % **local** : aucune requête réseau, rien ne quitte ta
page. Seul le **classement** (ci-dessous) est opt-in et envoie un strict minimum.

## L'idée : troller le troll, avec un câlin

Internet a un problème de méchanceté, et les réponses habituelles ne marchent pas :
la modération ressemble à de la censure, la morale agace, et bannir nourrit un
chat et à la souris sans fin.

**Un web de gentil** attaque le problème par l'autre bout. On ne combat pas la
toxicité, on la **ridiculise avec tendresse**. Quand un troll crache son venin,
l'extension le remplace — *dans le navigateur de celui qui lit* — par une
mascotte adorablement insolente : nounours, chaton, mémé, Bob Ross. Du poison
entre, du doudou sort. On **trolle le troll, avec un câlin**.

## Ce qu'il sait faire

- 🎭 **Mascottes (thèmes)** : Nounours 🧸 · Chatons 🐱 · Mémé 👵 · Bob Ross 🎨.
- 🎚️ **Intensité** : *Doux* (pur réconfort) · *Médium* · *Hardcore* (pique finale).
- 💕 **Cœurs semés** : des cœurs animés restent autour de chaque endroit filtré.
- 🪞 **Miroir gentil** : avant que **toi** tu postes un message dur, il te
  propose une version douce (tu peux toujours « envoyer quand même »).
- 🖱️ **Clic** sur un message adouci → révèle l'original.
- 🏆 **Classement mondial** (opt-in) : « compte sans compte », anonyme, gratuit.
- 🏅 **Badges & titres** : *Apprenti Câlin → Maître Câlin → Légende du Miel*.
- 🔥 **Séries quotidiennes** : jours d'affilée à adoucir le web.
- 🖼️ **Carte sociale** : image de ton rang/badges à partager.
- 🌟 **Nounours Légendaire** : easter egg doré sur les insultes rares.
- 🖍️ **Mode surligner** : marquer sans remplacer, révéler au clic.
- 🗑️ **Suppression autonome** : efface ton entrée du classement sans e-mail (code `DEL1`).

## Architecture (fichiers)

| Fichier | Rôle |
|---|---|
| `uwg-core.js` | **Noyau partagé** : lexiques par langue, banques par thème/intensité, détection, niveaux. |
| `content.js` | Remplace les commentaires de la page + confettis + niveaux. |
| `mirror.js` | Le Miroir gentil (vérifie tes propres brouillons). |
| `background.js` | Badge « nombre de câlins » par onglet + sync du classement. |
| `popup.html/js` | Réglages : thème, intensité, cœurs, miroir, niveau, classement. |
| `scoreboard.js` | « Compte sans compte » : identité anonyme + dialogue serveur. |
| `server/server.py` | Serveur de classement (Python, prod) · `server.js` = jumeau Node (tests). |
| `site/` | Landing [nounours.app](https://nounours.app) multilingue. |
| `demo.html` | Playground autonome (sans extension). |
| `test.html` | Fausse page réseau social pour tester l'extension. |

## Installer (mode développeur, ~30 s)

### 🅰️ Le plus simple — depuis une Release GitHub

1. **[Releases](https://github.com/PassepartoutFR/nounours-app/releases/latest)** → télécharge `nounours-app-vX.Y.Z.zip`.
2. Décompresse → dossier `nounours-app/`.
3. `brave://extensions` (ou `chrome://` / `edge://`) → **Mode développeur** → **Charger l'extension non empaquetée**.
4. Clique l'icône 🧸 → mascotte, intensité, c'est parti.

### 🅱️ Depuis le code source (pour contribuer)

1. Clone le dépôt → `brave://extensions` → **Mode développeur** → **Charger l'extension non empaquetée** → ce dossier.
2. Clique l'icône 🧸.

## Tester

- **`demo.html`** → double-clic, playground autonome (pas d'extension).
- **`test.html`** → fausse page de commentaires + Miroir gentil (extension requise).

> ⚠️ Pour `test.html` en `file://` : `brave://extensions` → détails → **Autoriser l'accès aux URL de fichier**.

## 🏆 Classement (opt-in, sans compte)

**Ton addon = ta connexion.** Identité anonyme (`uid` + clé secrète) générée
localement. Pas d'e-mail, pas de mot de passe. Désactivé par défaut ; si tu
rejoins, on n'envoie que `{identifiant, pseudo, score}` — **jamais** tes
commentaires ni les URLs.

```bash
node server/server.js   # local → http://127.0.0.1:8790
```

Popup → **Classement** → pseudo → **Rejoindre**.

**Sauvegarde** : export/import d'identité (code `UWG1`) pour changer de machine.
**Suppression** : code temporaire `DEL1` (15 min) ou bouton direct dans le popup ;
formulaire sur [nounours.app/privacy.html](https://nounours.app/privacy.html).

## Vie privée (ligne rouge)

- **Filtrage 100 % local** — rien ne quitte ta machine pour la détection.
- **Classement opt-in** — strict minimum si tu choisis de rejoindre.
- **Pas de pistage** — zéro cookie, zéro pub, zéro revente.
- **Open source MIT** — le code est la confiance.

## Régler / bidouiller (`uwg-core.js`)

- **Mots détectés** : `LEX` (une liste par langue).
- **Répliques** : `BANKS` (`BANKS.nounours.fr`, `BANKS.chatons.en`…).
- **Intensité** : `SOFT` / `SAVAGE`.
- **Niveaux** : `LEVELS`.
- **Nouvelle langue** : clé dans `LEX`, chaque thème de `BANKS`, `SOFT`/`SAVAGE`/`HINT` + `site/i18n.js`.

## Limites connues

- Détection **par mots-clés** : faux positifs/négatifs assumés, pas de contexte.
- On remplace le **nœud de texte entier** contenant un mot méchant.
- Le Miroir intercepte **Entrée** / *submit* ; tu gardes toujours la main.

## Contribuer

Les PR sont les bienvenues — langues, répliques plus drôles, ports navigateur.
Voir [CONTRIBUTING.md](CONTRIBUTING.md).

> Le web n'a pas besoin de plus de gardiens. Il a besoin de plus de **nounours**. 🧸