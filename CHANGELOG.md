# Changelog

Versions notables. SemVer ; format inspiré de *Keep a Changelog*.

## [0.7.0] — non publié
### Ajouté
- 🌟 **Nounours Légendaire** : ~1 commentaire méchant sur 25 réveille une réponse
  **dorée et brillante** (rare, stable par texte, multilingue).
- 🛡️ **Détection anti-obfuscation** : reconnaît le *leetspeak* (`c0nnard`, `5tupid`,
  `d3gage`) et les **lettres répétées** (`saloooope`), sans surdétecter le texte normal.
- 📊 **Tableau des gentils** (site) : tableau de bord vivant sur nounours.app —
  visiteurs présents en direct, visites du jour/au total (sparkline 14 jours),
  comptes équipés et méchancetés adoucies. **Respect total de la vie privée** :
  identifiant de session éphémère, présence en RAM seulement, compteurs agrégés,
  **zéro cookie, zéro pistage, aucune IP stockée** (anti-gonflage par IP). Traduit
  en 7 langues, page vie privée mise à jour.
- 🏅 **Succès & badges** : 10 badges à débloquer (Premier câlin, Centurion,
  Polyglotte, Tour de Babel, chasseur de Nounours Légendaire…), affichés dans
  le popup. Suivi local des langues croisées et des légendaires vus.
- 🔥 **Séries quotidiennes** : compteur de **jours d'affilée** à adoucir le web
  (jour UTC, +1 si consécutif, reset après un trou) + 2 badges de série.
- 🖼️ **Carte sociale partageable** : génère en 1 clic une image (pseudo, rang,
  niveau, série, badges) prête à poster, depuis le popup.
- 🇵🇱 **Polonais** : 8ᵉ langue — détection ET réponses des mascottes en polonais.
- 🖍️ **Mode « surligner sans remplacer »** : option pour marquer le commentaire
  (texte d'origine atténué + souligné) et révéler la mascotte au clic.
- 📄 **README anglais** (`README.en.md`) + **FAQ** (`docs/FAQ.md`) pour l'open source.
- 🛠️ **Panneau admin** (`site/admin.html`) : santé serveur, stats et **modération
  du classement** (retirer une entrée), protégé par une **clé en variable d'env**
  (`NOUNOURS_ADMIN_KEY`, jamais commitée ; admin désactivé si absente). Endpoints
  `/admin/overview|scores|delete` sur les deux serveurs jumeaux (Node + Python).
- 🚩 **Signalement « pas méchant »** (faux positif) : un drapeau discret sur chaque
  message adouci permet de signaler une fausse détection — n'envoie **QUE le code de
  langue** (jamais le texte ni l'URL). Compteur agrégé par langue, visible dans l'admin.
- 🛡️ **Équipes / guildes** (opt-in) : rejoins une équipe avec un **code libre** ;
  vos câlins se cumulent → **classement d'équipes**. Aucune donnée perso (juste le code).
- 🌍 **Compteur mondial live** (site) : grand compteur animé « X trolls câlinés »
  sur la home, rafraîchi en direct, avec éclat aux paliers ronds.
- ☀️ **Météo de la gentillesse** (site) : humeur du jour calculée sur les stats
  agrégées (« ensoleillé câlin · 92 % de douceur »), traduite, **100 % côté client**.

## [0.6.0] — non publié
### Ajouté
- 💾 **Export/import d'identité** : sauvegarde/restaure ton compte (code `UWG1`)
  pour ne jamais perdre ton score, même en réinstallant.
- 🌐 Support **Edge** (même paquet) et **Firefox** (`scripts/build-firefox.cjs`).
- 📖 Livre blanc en **anglais**.
- 🧪 Harnais de **tests** unitaires + CI.

## [0.5.0] — soumis au Chrome Web Store (2026-06-26)
### Ajouté
- Première version publique : détection locale multilingue (**7 langues**),
  mascottes (nounours / chatons / mémé / Bob Ross), intensité
  (doux / médium / hardcore), **cœurs animés**, **miroir gentil**,
  **classement « compte sans compte »**.
- Site **nounours.app** multilingue + page vie privée.
