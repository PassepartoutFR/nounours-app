# Changelog

**🇬🇧 English version → [CHANGELOG.en.md](CHANGELOG.en.md)** · **🏠 Hub bilingue → [CHANGELOG.md](CHANGELOG.md)**

Versions notables. SemVer ; format inspiré de *Keep a Changelog*.

## [0.7.9] — 2026-06-26

### Corrigé
- 🧠 **IA locale enfin fonctionnelle** : TensorFlow.js utilise `eval`, interdit par
  la CSP des pages d'extension MV3 (`EvalError` → le modèle ne s'initialisait pas).
  Solution canonique : TF.js tourne désormais dans un **iframe *sandboxé*** (où
  l'eval est permis), hébergé par le document offscreen qui relaie par
  `postMessage`. Le modèle prouvé (« stupid moro » → 0.99) reste identique — on a
  juste changé *où* il s'exécute.

## [0.7.8] — 2026-06-26

### Corrigé
- 🩺 **Diagnostic offscreen** : si la création du document offscreen (qui héberge
  le modèle IA) se **bloque** au lieu d'aboutir, on lève désormais une erreur au
  bout de 20 s → le popup affiche le souci au lieu d'un « test en cours » infini.
  Logs `UWG-AI[sw]` enrichis (« création… » → « créé ✓ »).

## [0.7.7] — 2026-06-26

### Corrigé
- 🧪 **Bouton « Tester l'IA » honnête** : il **attend** que le modèle finisse de
  charger (jusqu'à 90 s pour les ~25 Mo) avant de classer, au lieu d'expirer à
  15 s et d'afficher un trompeur « score 0.00 ». Il affiche désormais soit le
  **vrai score**, soit **« ⏳ encore en chargement »**, soit l'**erreur exacte**.
  (Le test force aussi le chargement même si l'option n'est pas encore activée.)

## [0.7.6] — 2026-06-26

### Amélioré
- 👁️ **IA locale visible** : à l'activation, le modèle se charge **tout de suite**
  (au lieu d'attendre un commentaire « gris »), et le popup affiche son **état en
  direct** (⏳ chargement / ✅ prêt / ⚠️ erreur exacte) + un bouton **« 🧪 Tester
  l'IA »** qui montre le score sur une phrase d'exemple. Fini l'IA invisible : on
  voit qu'elle est active (ou l'erreur précise, surfacée dans le popup).

## [0.7.5] — 2026-06-26

### Ajouté
- 🆕 **Notification de mise à jour** : l'extension vérifie (toutes les 12 h) s'il
  existe une release plus récente sur GitHub et, le cas échéant, affiche dans le
  popup « Nouvelle version dispo → Télécharger ». (Les versions chargées « non
  empaquetées » ne peuvent pas s'auto-installer — Chrome l'interdit ; la vraie
  auto-mise-à-jour viendra avec la publication sur le Chrome Web Store.) Fail-safe,
  n'écrase pas le badge « nombre de câlins ».

## [0.7.4] — 2026-06-26

### Corrigé
- 🔧 **CSP** : le `connect-src` ajouté en 0.7.3 (pour charger le modèle IA)
  bloquait par erreur les appels au **classement** (`nounours.app/api`). Hôtes
  `nounours.app` + localhost ré-autorisés. (Régression de la 0.7.3.)

## [0.7.3] — 2026-06-26

### Ajouté
- 🧠 **IA locale (expérimental)** — option du popup, **désactivée par défaut**.
  Un petit modèle de toxicité tourne **100 % dans ton navigateur** (hors-page,
  dans un *offscreen document*) et **comprend le sens** : il câline les insultes
  voilées que les listes ratent (« What a stupid moro » → adouci). **Hybride** :
  la liste de mots tranche en 0 ms, l'IA n'est appelée que sur les **cas gris**
  (un mot dur sans cible claire). Modèle ~25 Mo téléchargé une fois puis caché.
  **Fail-safe** : toute erreur IA → repli silencieux sur les listes (zéro casse) ;
  libs TF.js **vendorées** (aucun code distant), seules les données du modèle se
  chargent au runtime.

## [0.7.2] — 2026-06-26

### Ajouté
- 🎚️ **Réglage de sensibilité de détection** (popup) : **Précise** (défaut — que
  les vraies attaques, 0 faux positif) ou **Large** (adoucit aussi les mots durs
  isolés comme « dumb » / « stupide » sans exiger de cible — beaucoup plus de
  prises, quelques faux positifs assumés). Reste **scopé par langue**.

## [0.7.1] — 2026-06-26 (bêta testable sur GitHub)

> 0.7.1 = première build publiée (le tag 0.7.0 avait échoué au CI release :
> action `chrome-extension-upload@v5` inexistante). Contenu identique à 0.7.0.
### Ajouté
- 🎯 **Détection repensée — beaucoup moins de faux positifs** : refonte du moteur
  (panel d'experts, 8 langues). Lexiques à **2 niveaux** — insultes *toujours-attaque*
  vs mots **contextuels** qui ne déclenchent QUE s'ils **visent une personne**
  (« c'est stupide / je crève de faim / das ist dumm » ne sont plus adoucis) ;
  **scoping par langue** (fini le tir croisé inter-langues : `idiota`, `loser`, `dom`…) ;
  `norm` corrigé (collapse 3+ au lieu de 2+, leetspeak intra-mot, fix polonais `ł`).
  Validé sur un **corpus de 213 phrases** (`test/corpus.json`) : **0 faux positif
  (100 % précision)**, **96 % de rappel** sur les vraies attaques.
- 🗑️ **Suppression autonome du classement** : plus besoin d'e-mail — code
  temporaire `DEL1` (15 min) depuis le popup ou suppression directe ; page
  vie privée avec formulaire (`POST /api/account/delete`).
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
- 🔄 **Listes de détection éditables à distance** (opt-in, **défaut OFF**) : le
  mainteneur ajuste les mots détectés / répliques depuis l'admin (clé), servis en
  JSON ; l'extension reste **100 % locale par défaut** et, si activé, fusionne les
  listes (données seulement, jamais de code, plafonnées, repli sûr sur l'intégré).
- 🌍 **Carte de chaleur de la gentillesse** (site) : d'où vient la gentillesse, par
  **langue du navigateur (approximatif, jamais l'IP)**, agrégé, traduit, honnête.

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
