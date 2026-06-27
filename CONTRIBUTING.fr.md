# Contribuer à Un web de gentil 🧸

**🇬🇧 English version → [CONTRIBUTING.en.md](CONTRIBUTING.en.md)** · **🏠 Hub bilingue → [CONTRIBUTING.md](CONTRIBUTING.md)**

Merci d'aider à rendre le web un peu plus doudou ! Les PR sont les bienvenues,
surtout pour :

## 🌍 Ajouter / améliorer une langue
Tout est dans **`uwg-core.js`** :
- `LEX` — la liste de mots détectés, une par langue.
- `BANKS` — les répliques des mascottes, par thème puis par langue.
- `SOFT` / `SAVAGE` — l'intensité (doux / hardcore).
- `HINT` — la bulle d'aide.

Le texte est normalisé (minuscule, sans accents) → pas besoin de gérer les
accents dans `LEX`. Ajoute la clé de langue partout, et c'est tout.

Le **site** (`site/`) a son propre dico dans `site/i18n.js` (85 clés × langue).

## 😹 Des répliques plus drôles
Édite les `BANKS` dans `uwg-core.js`. Reste **taquin sans être méchant** : on
troll le troll avec de la gentillesse, jamais avec de la haine en retour.

## 🧪 Tester
- `demo.html` (autonome, double-clic) pour le moteur.
- `test.html` (avec l'extension chargée) pour le rendu réel + le Miroir gentil.
- Vérif rapide : `node --check <fichier>.js`.
- Suite complète : `node test/run.mjs` (noyau, serveur, **mirror.js**, **content.js** via `test/dom-lite.mjs` — zéro dépendance npm).
- Nouveau test DOM : ajoute un cas dans `test/mirror-content.mjs` ; le harnais minimal vit dans `test/dom-lite.mjs`.

## 🎨 Style
- Pas de dépendance, pas de build pour l'extension (sauf le zip de release).
- Garde le ton chaleureux, drôle, **jamais moralisateur**.

## 📦 Architecture (rappel)
- `uwg-core.js` — noyau partagé (détection + répliques).
- `content.js` / `mirror.js` / `content.css` — ce qui agit sur les pages.
- `popup.*` — réglages.
- `server/` — le classement (Python, autonome).
- `site/` — la landing nounours.app.

Pas de règle stricte : ouvre une issue, propose, on en discute. 🧸
