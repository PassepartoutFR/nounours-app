# Feuille de route — Un web de gentil 🧸

## Comment ce projet est piloté

Ce projet est développé en **mode autonome** par un agent (Claude, « le chef du
dev »). Le rôle de l'humain mainteneur (**PassepartoutFR**) est de **juger,
continuer, arrêter ou rediriger** — pas de coder chaque détail.

**L'agent décide et exécute seul** : choix du prochain item ci-dessous, code,
tests, `commit`/`push` sur `main` (réversible), docs, refactors. Il rend compte
après.

**Restent à la décision humaine (checkpoints, l'agent prépare mais n'exécute
pas seul) :**
- 💸 dépenser de l'argent ;
- 🚀 **publier une release aux utilisateurs** (tag `vX.Y.Z` → store) ;
- 🌍 **déployer en production** (nounours.app / serveur) ;
- ⚖️ un changement de **direction produit** ou de **vision** (cf. livre blanc).

**Pour rediriger** : édite ce fichier (ou ouvre une issue / dis-le). L'ordre des
sections = la priorité.

---

## 🔜 Maintenant (en cours / immédiat)
- [ ] Review Chrome de la **v0.5.0** → à l'approbation : basculer le bouton
      « Installer » de la landing vers le lien Web Store + redéployer.
- [ ] **Tester l'export/import d'identité** dans un vrai navigateur.
- [ ] Soumettre sur **Edge** (même paquet, gratuit).

## ▶️ Ensuite
- [ ] Soumettre sur **Firefox** (`scripts/build-firefox.cjs` + web-ext).
- [ ] **Stats par langue** dans le popup (mini répartition).
- [ ] **Armer l'auto-publication** (secrets OAuth → release auto au tag).
- [ ] Élargir le harnais de **tests** (mirror, content — via jsdom léger).

## 🌱 Plus tard
- [ ] Pattern **permissions optionnelles** (liste par défaut + « Activer partout »)
      pour des reviews plus rapides.
- [ ] **Durcir l'anti-triche** du classement (au-delà de l'honneur).
- [ ] **Thèmes communautaires** + plus de langues (portés par les PR).
- [ ] **Safari** (si la demande existe).
- [ ] **Promo** (Product Hunt, Reddit) une fois publié.

## ✅ Fait
- Extension MV3 : détection locale multilingue (7 langues), mascottes,
  intensité, cœurs animés, miroir gentil.
- Classement « compte sans compte » (serveur Python) + **export/import d'identité**.
- 🌟 **Nounours Légendaire** (easter egg doré) · 🛡️ **anti-obfuscation** (leetspeak / lettres répétées) · 🏅 **succès & badges** (10) + 🔥 **séries quotidiennes** · 🖼️ **carte sociale partageable** dans le popup · `CHANGELOG.md`.
- 🇵🇱 **Polonais** (8ᵉ langue) · 🖍️ **mode surligner sans remplacer** · 📄 **README EN + FAQ**.
- 🛠️ **Panneau admin** (`site/admin.html` + `/admin/*`, clé en env) : santé/stats + modération du classement. *(à déployer : poser `NOUNOURS_ADMIN_KEY`)*
- 🚩 **Faux positifs signalables** (code de langue seul) · 🛡️ **équipes/guildes** · 🌍 **compteur mondial live** · ☀️ **météo de la gentillesse**. *(serveur + site à déployer)*
- 🔄 **Listes éditables à distance** (opt-in, défaut OFF) · 🗺️ **carte de chaleur** (par langue, jamais l'IP) → **les 10 idées admin/dashboard sont faites.** *(serveur + site à déployer)*
- 📊 **Tableau des gentils** : données vivantes sur le site (visiteurs en direct +
  stats agrégées), respect total de la vie privée — **déployé + live 2026-06-26**.
- Site **nounours.app** multilingue + page vie privée.
- **Open source** (repo public, MIT, templates, CODEOWNERS).
- **Livre blanc** FR + EN, doc releases, doc multi-navigateur.
- **CI** : tests unitaires + build du zip au tag (+ auto-publish si secrets).
- 1ʳᵉ **soumission Chrome Web Store**.
