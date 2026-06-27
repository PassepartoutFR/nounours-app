# Microsoft Edge Add-ons — fiche à coller 🧸

Dashboard : https://partner.microsoft.com/dashboard/microsoftedge/overview

**Gratuit** — pas de frais développeur (contrairement au Chrome Web Store).

---

## Paquet à uploader

Télécharge depuis les [Releases GitHub](https://github.com/PassepartoutFR/nounours-app/releases/latest) :

- **`nounours-app-vX.Y.Z.zip`** — même archive que Chrome / Brave (MV3 identique)

> Dernière release connue : v0.7.12

---

## Identité

| Champ | Valeur |
|---|---|
| **Nom** | Un web de gentil |
| **Description courte** (≤ 132 car.) | `Remplace les commentaires méchants par des mascottes câlines et taquines. 8 langues, 100 % local, gratuit à vie. 🧸` |
| **Catégorie** | Réseaux sociaux & communication |
| **Langue par défaut** | Français |
| **Politique de confidentialité** | https://nounours.app/privacy.html |
| **Site web** | https://nounours.app |
| **Contact développeur** | contact@nounours.app |

## Description détaillée

Reprends le bloc « Description détaillée » de [`STORE-LISTING.md`](STORE-LISTING.md) — texte identique.

## Objectif unique (single purpose)

Adoucir les commentaires toxiques affichés sur les pages web en les remplaçant,
côté navigateur, par des messages bienveillants et humoristiques.

## Justification des permissions

Reprends le bloc « Justification des permissions » de [`STORE-LISTING.md`](STORE-LISTING.md).

Ajoute si demandé :

- **offscreen** — Document hors écran pour charger le modèle IA local (TensorFlow.js)
  dans un contexte autorisé par la CSP MV3.
- **sandbox** — Iframe sandboxé pour exécuter TensorFlow.js (nécessite `eval`).

## Pratiques de données (Privacy)

Identique Chrome :

- Collecte **uniquement** si l'utilisateur active le classement (uid anonyme, pseudo, score).
- **Jamais** : contenu des pages, URLs, données personnelles identifiables.

## Assets visuels

- Icône : `icons/icon128.png` (dans le zip)
- Captures 1280×800 : https://nounours.app + `demo.html`

## Checklist soumission

1. [ ] Compte Microsoft Partner (gratuit)
2. [ ] « Créer une extension » → upload `nounours-app-vX.Y.Z.zip`
3. [ ] Coller description + permissions + privacy URL
4. [ ] Ajouter captures d'écran
5. [ ] Soumettre pour review
6. [ ] (Optionnel) Mettre à jour nounours.app avec lien Edge Add-ons une fois publié

## Après publication

Ajoute le lien store Edge dans `site/i18n.js` (`inst_edge`) et redeploie nounours.app.