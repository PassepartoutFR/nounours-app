# 🧸 Un web de gentil

Extension navigateur (Chromium / **Brave** / Chrome / Edge) qui **remplace les
commentaires méchants par des messages de mascottes** trolls et ironiques.

**🌍 [nounours.app](https://nounours.app) · Licence MIT · Gratuit à vie · Bientôt sur le Chrome Web Store**

**Multilingue (7 langues)** : FR, EN, ES, IT, DE, PT, NL. La détection ET la
réponse se font dans la langue du commentaire — un troll espagnol se fait
répondre en espagnol, un allemand en allemand. (La langue de la page,
`<html lang>`, est prioritaire pour lever l'ambiguïté des mots partagés comme
« idiot ».)

Le **filtrage** est 100 % **local** : aucune requête réseau, rien ne quitte ta
page. Seul le **classement** (ci-dessous) est opt-in et envoie un strict minimum.

## Ce qu'il sait faire

- 🎭 **Mascottes (thèmes)** : Nounours 🧸 · Chatons 🐱 · Mémé 👵 · Bob Ross 🎨.
- 🎚️ **Intensité** : *Doux* (pur réconfort) · *Médium* · *Hardcore* (pique finale).
- 💕 **Cœurs semés** : des cœurs animés restent autour de chaque endroit filtré.
- 🏆 **Gamification** : titres qui montent (*Apprenti Câlin → Maître Câlin →
  Légende du Miel*) + **classement mondial** (voir plus bas).
- 🪞 **Miroir gentil** : avant que **toi** tu postes un message dur, il te
  propose une version douce (tu peux toujours « envoyer quand même »).
- 🖱️ **Clic** sur un message adouci → révèle l'original.

## Architecture (fichiers)

| Fichier | Rôle |
|---|---|
| `uwg-core.js` | **Noyau partagé** : lexiques par langue, banques par thème/intensité, détection, niveaux. Utilisé par l'extension **et** le playground. |
| `content.js` | Remplace les commentaires de la page + confettis + niveaux. |
| `mirror.js` | Le Miroir gentil (vérifie tes propres brouillons). |
| `background.js` | Badge « nombre de câlins » par onglet + sync du classement. |
| `popup.html/js` | Réglages : thème, intensité, cœurs, miroir, niveau, classement. |
| `scoreboard.js` | « Compte sans compte » : identité anonyme + dialogue serveur. |
| `server/server.js` | Serveur de classement (Node, sans dépendance). |
| `content.css` | Styles (pastille, cœurs, toast, miroir). |
| `test.html` | Fausse page réseau social pour tester l'extension. |
| `demo.html` | **Playground autonome** (sans extension) — voir plus bas. |

## Installer (mode développeur, ~30 s)

1. Ouvre `brave://extensions` (ou `chrome://extensions`).
2. Active **Mode développeur** (coin haut-droit).
3. **Charger l'extension non empaquetée** → choisis ce dossier (`web-de-gentil`).
4. Clique l'icône 🧸 → choisis ta mascotte, ton intensité, etc.

## Tester

- **Le plus simple : `demo.html`** → double-clique le fichier. C'est un
  **playground autonome** (il charge `uwg-core.js` en `<script>`, donc pas besoin
  d'extension ni de serveur) : tape un commentaire, change de thème/intensité,
  vois la transformation en direct.
- **L'extension : `test.html`** → fausse page de commentaires (FR/EN/ES/IT/DE/PT/NL,
  statiques + dynamiques) + un composer pour essayer le **Miroir gentil**.

> ⚠️ Pour que l'extension agisse sur `test.html` ouvert en `file://`, va dans
> `brave://extensions` → détails de « Un web de gentil » → active **Autoriser
> l'accès aux URL de fichier**. (`demo.html`, lui, marche sans rien activer.)

## 🏆 Classement (opt-in, sans compte, gratuit à vie)

L'idée : **ton addon = ta connexion**. À la première utilisation, l'extension
génère une **identité anonyme** (un `uid` + une clé secrète) qui vit dans
l'extension. Pas d'e-mail, pas de mot de passe. Tu choisis un pseudo, et ton
score de trolls câlinés monte dans un classement mondial.

**Vie privée** : c'est **désactivé par défaut**. Si tu rejoins, on n'envoie que
`{identifiant anonyme, pseudo, score}` — **jamais** tes commentaires ni les URLs
que tu visites. Le filtrage, lui, reste 100 % local.

**Lancer le serveur** (local, pour tester) :

```bash
node server/server.js        # → http://127.0.0.1:8790   (ou: npm run server)
```

Puis dans le popup → **Classement** → entre un pseudo → **Rejoindre**. Ton rang
et le top 10 s'affichent. Ouvre une 2ᵉ « identité » (autre profil de navigateur)
pour voir plusieurs joueurs.

**Anti-triche (léger, système à l'honneur)** : score **monotone** (ne baisse
jamais), plafond de hausse par envoi, et **token** par `uid` (= `HMAC(secret,
uid)`, TOFU) → personne ne peut écraser le score d'un autre. C'est spoofable par
qui le veut vraiment (client anonyme), c'est assumé : c'est pour le fun.

**Héberger pour de vrai (plus tard)** : déploie `server/server.js` sur un hôte,
puis change l'endpoint. Il faudra ajouter le domaine dans `host_permissions`
(manifest) et stocker `uwg_endpoint` dans `chrome.storage`. Idées : petit VPS,
fonction serverless, ou un KV hébergé. *(Sauvegarde/restauration de l'identité
entre machines = nice-to-have à venir.)*

## Régler / bidouiller (tout est dans `uwg-core.js`)

- **Mots détectés** : objet `LEX` (une liste par langue). Le texte est normalisé
  (minuscule, sans accents) → inutile de gérer les accents dans les listes.
- **Phrases des mascottes** : objet `BANKS` (`BANKS.nounours.fr`, `BANKS.chatons.en`…).
- **Intensité** : `SOFT` (doux) et `SAVAGE` (piques hardcore).
- **Niveaux** : `LEVELS`.
- **Ajouter une langue** : ajoute la clé dans `LEX`, dans chaque thème de `BANKS`,
  et dans `SOFT`/`SAVAGE`/`HINT`. C'est tout.
- **Ajouter une mascotte** : ajoute une entrée dans `BANKS` + une dans `THEMES`.

## Limites connues (proto)

- Détection **par mots-clés** : faux positifs/négatifs assumés. Pas de
  compréhension du contexte (« je ne suis pas un idiot » sera quand même adouci).
  Étape suivante possible : un modèle de toxicité local (ONNX) — au prix de plus
  de poids, mais en gardant le « 100 % local ».
- On remplace le **nœud de texte entier** contenant un mot méchant.
- Le Miroir intercepte l'envoi sur **Entrée** / *submit* dans les champs
  éditables ; il te laisse toujours la main (« envoyer quand même »).

## Idées de suite

- Liste blanche de sites.
- Mode « surligner sans remplacer » pour comparer.
- Statistiques par langue dans le popup.
- Easter eggs (insulte rare → mascotte « légendaire » dorée).
