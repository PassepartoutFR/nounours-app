# Chrome Web Store — fiche à coller 🧸

Tout ce qu'il faut copier dans le dashboard (https://chrome.google.com/webstore/devconsole).
Frais : **5 $ une fois** pour ouvrir le compte développeur.

---

## Identité
- **Nom** : Un web de gentil
- **Description courte** (≤ 132 car.) :
  `Remplace les commentaires méchants par des mascottes câlines et taquines. 7 langues, 100 % local, gratuit à vie. 🧸`
- **Catégorie** : Réseaux sociaux & communication (ou « Amusant »)
- **Langue par défaut** : Français
- **Politique de confidentialité (URL)** : https://nounours.app/privacy.html
- **Site web** : https://nounours.app

## Description détaillée (à coller)
Marre des commentaires haineux ? « Un web de gentil » les repère et les remplace
par des mascottes adorablement insolentes : un nounours, un chaton, une mémé
bienveillante ou Bob Ross. La méchanceté gratuite entre… une absurdité câline
ressort. On troll le troll — avec un câlin.

✦ 7 langues : détecte ET répond dans la langue du commentaire.
✦ Choisis ta mascotte et l'intensité (Doux / Médium / Hardcore — toujours gentil).
✦ Des cœurs animés poussent là où ça a filtré.
✦ Le « Miroir gentil » : avant que TOI tu postes un message dur, il te propose
   une version douce. Tu restes maître.
✦ Classement mondial optionnel, « compte sans compte » (anonyme).

🔒 Vie privée d'abord : le filtrage tourne à 100 % dans ton navigateur. On ne lit
rien, on ne stocke rien, on n'envoie rien — sauf si tu rejoins le classement, où
seuls ton pseudo et ton score partent (jamais tes commentaires ni tes URLs).

💛 Gratuit. Pour toujours. Open source.

## Objectif unique (single purpose)
Adoucir les commentaires toxiques affichés sur les pages web en les remplaçant,
côté navigateur, par des messages bienveillants et humoristiques.

## Justification des permissions (champ par champ)
- **storage** — Mémoriser les réglages de l'utilisateur (mascotte, intensité,
  cœurs, miroir), son compteur et son identité anonyme locale.
- **alarms** — Resynchroniser périodiquement le score si l'utilisateur a, de son
  plein gré, rejoint le classement.
- **host permission `<all_urls>`** — Le contenu toxique peut apparaître sur
  n'importe quel site. Le content script lit le texte des pages **localement**
  pour détecter et remplacer les insultes. Aucune donnée de page n'est
  transmise ni stockée.
- **host permission `https://nounours.app/*`** — Envoyer/lire le classement
  (uniquement si l'utilisateur a activé l'option).

## Divulgation des pratiques de données (Privacy practices)
- Collecte de données : **uniquement si l'utilisateur active le classement.**
  Données alors transmises : identifiant **anonyme**, pseudo choisi, score.
- **Non** collecté : informations personnelles identifiables, contenu des pages,
  historique de navigation, localisation, données financières/santé.
- Pas de revente, pas de transfert à des tiers, pas de pub.
- Cocher : « Je ne vends pas les données » / « Usage conforme au objectif unique ».

## Assets visuels à fournir
- Icône : `icons/icon128.png` (déjà dans le zip).
- Captures d'écran 1280×800 (au moins 1) : prends-les sur https://nounours.app
  et sur `demo.html` (hero avant/après, mascottes, classement).
- (Optionnel) petite/grande tuile promo.

## Le paquet à uploader
`nounours-app-X.Y.Z.zip` (Releases GitHub, ex. v0.7.12). Il contient
uniquement les fichiers de l'extension (manifest, scripts, css, popup, icônes) —
pas le site, ni le serveur, ni les docs.

> ⚠️ Pense à créer la boîte **contact@nounours.app** (ou change l'adresse dans
> `site/privacy.html`) : elle sert de contact dans la politique de confidentialité.
