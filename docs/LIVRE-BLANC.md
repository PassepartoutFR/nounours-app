# Livre blanc — Un web de gentil 🧸

*La gentillesse comme arme de désarmement massif du troll.*

**Version 1.0 — juin 2026** · [nounours.app](https://nounours.app) · Licence MIT

---

## Résumé

Internet a un problème de méchanceté, et les réponses habituelles ne marchent
pas : la modération est vécue comme de la censure, le discours moralisateur
braque, et le bannissement nourrit un jeu du chat et de la souris sans fin.

**Un web de gentil** prend le problème par l'autre bout : on ne combat pas la
toxicité, on la **ridiculise par la tendresse**. Quand un troll crache son venin,
l'extension le remplace, *dans le navigateur de celui qui lit*, par une mascotte
adorablement insolente — un nounours, un chaton, une mémé, Bob Ross. Le poison
entre, une absurdité câline ressort. On **troll le troll, avec un câlin**.

Ce document pose la vision, les principes non négociables, ce que le produit
n'est **pas**, et comment il tient dans le temps.

---

## 1. Le problème

La toxicité en ligne est réelle et coûteuse (santé mentale, départ des espaces
publics, autocensure). Mais les outils dominants ont trois angles morts :

1. **La modération ressemble à de la censure.** Supprimer un message, c'est
   donner raison au troll (« on me fait taire ») et déplacer le combat.
2. **Le moralisme est inefficace.** « La haine c'est mal » n'a jamais désarmé
   personne ; ça renforce les positions.
3. **Le bannissement est un jeu sans fin.** Nouveau compte, nouveau venin. On
   traite le symptôme, jamais l'expérience de celui qui reçoit.

Le point aveugle commun : tous ces outils agissent **sur le troll**. Personne ne
protège, en premier, **l'expérience de celui qui lit**.

## 2. La thèse

> On ne gagne pas contre la méchanceté en étant plus dur. On gagne en la rendant
> **risible et inoffensive**.

Notre pari : **l'humour désamorce ce que la sévérité aggrave.** Un troll qui se
fait répondre par un nounours qui le félicite pour son courage derrière un écran
n'a plus de prise. Sa cruauté devient une blague — la nôtre, pas la sienne.

Et surtout : le changement se passe **du côté du lecteur**, localement,
instantanément, sans rien demander à personne. Pas de plateforme à convaincre,
pas de compte à créer, pas de troll à bannir. Juste un web qui, chez toi,
redevient un peu plus doux.

## 3. Principes fondateurs (non négociables)

Ce sont les lignes rouges. Un changement qui en viole une n'entre pas dans le
produit.

- **Vie privée par construction.** Le filtrage est 100 % local. Le contenu que tu
  lis, les pages, les URLs : rien ne quitte ta machine. Jamais.
- **Opt-in pour tout ce qui sort.** La seule donnée qui peut partir (le score du
  classement) ne part que si tu l'actives — et c'est un pseudo + un nombre, point.
- **Gratuit à vie.** Pas d'abonnement, pas de « premium », pas de piège. La
  gentillesse ne se loue pas.
- **Open source.** Le code est la confiance. Tout est vérifiable (licence MIT).
- **L'utilisateur reste maître.** On n'écrit jamais à sa place. Le « Miroir
  gentil » *propose* une version douce de **ton** brouillon ; tu décides.
- **Multilingue.** La gentillesse n'a pas de frontière. On détecte et on répond
  dans la langue du troll.
- **Drôle d'abord, jamais moralisateur.** Si c'est donneur de leçons, c'est raté.

## 4. Ce que ce n'est PAS (anti-objectifs)

Aussi important que la vision : refuser les dérives.

- **Pas un outil de modération ni de censure.** On ne supprime rien sur les
  serveurs des plateformes ; on adoucit l'affichage, chez le lecteur, de façon
  réversible (un clic révèle l'original).
- **Pas de la surveillance.** Aucune collecte de comportement, d'historique, de
  profil. Pas de cookies de pistage, pas de pub, pas de revente.
- **Pas un juge de la vérité.** La détection est une **heuristique légère et
  faillible** (listes de mots), assumée comme telle. Elle se trompera parfois —
  c'est pour ça que tout est réversible et que rien n'est définitif.
- **Pas une arme contre des personnes.** On se moque de la *méchanceté*, pas des
  individus. Le ton reste tendre, jamais haineux en retour.

## 5. Le produit

Cinq piliers, tous réversibles, tous locaux (sauf le classement, opt-in) :

| Pilier | Idée |
|---|---|
| **Détection locale multilingue** | 7 langues, dans le navigateur, zéro réseau. |
| **Mascottes & intensité** | Choisis ta voix (nounours/chaton/mémé/Bob Ross) et ton ton (doux → hardcore, toujours gentil). |
| **Cœurs semés** | Là où ça a filtré, des cœurs poussent. Le fil devient un jardin. |
| **Miroir gentil** | Avant que *toi* tu postes un message dur, il t'en propose une version douce. |
| **Classement sans compte** | Une identité anonyme vit dans l'extension. Plus tu adoucis, plus tu montes. Opt-in. |

## 6. Soutenabilité (comment ça tient)

Un produit gratuit et privé, ça inquiète : « si c'est gratuit, c'est toi le
produit ». Pas ici, et voici pourquoi c'est tenable :

- **Les coûts sont quasi nuls.** Tout le travail se fait sur la machine de
  l'utilisateur (zéro coût de calcul côté serveur, zéro facture d'API). Le seul
  service en ligne, le classement, est un petit serveur sans dépendance dont le
  coût marginal est négligeable.
- **On ne monétise pas les données — par principe, pas par défaut.** Il n'y a
  rien à vendre : on ne collecte rien.
- **Financement possible, jamais aux dépens de l'utilisateur** : dons / sponsors
  open source, soutien de communautés. Jamais de pub, jamais de revente, jamais
  de mur payant sur la gentillesse.

La valeur créée n'est pas un ARPU. C'est un **déplacement de norme** : montrer
qu'on peut répondre à la toxicité autrement que par la sévérité.

## 7. Gouvernance & communauté

- **Licence MIT**, code intégralement public.
- **Contributions bienvenues**, en priorité : nouvelles langues, répliques plus
  drôles, ports navigateurs. Tout passe par des PR publiques.
- **Transparence** : pas de fonctionnalité cachée, pas de télémétrie discrète.
  Ce que fait l'extension est lisible dans le code.

## 8. Horizon

Sans promesse de date — des directions :

- Ports **Edge / Firefox / Safari** (le même esprit, partout).
- Plus de **langues** et de **mascottes** (portées par la communauté).
- **Export / import de l'identité** (ne jamais perdre son score).
- Une éventuelle **API publique de gentillesse** (réutiliser le moteur ailleurs).
- Des **thèmes communautaires** (chacun sa façon d'être gentil).

## 9. Comment on mesure le succès

Pas en temps passé, pas en clics, pas en engagement. En :

- **trolls câlinés** (le seul compteur qui compte) ;
- **sourires** déclenchés ;
- et, à terme, une **idée qui se répand** : la méchanceté en ligne, ça se
  désamorce — et ça peut même être drôle.

---

## Manifeste

> Le web n'a pas besoin de plus de gardiens.
> Il a besoin de plus de **nounours**.
>
> On ne fera pas taire les trolls. On les rendra **adorables malgré eux**.
> On ne fera pas la morale. On fera **sourire**.
> Et là où d'autres mettent un mur, on mettra un **câlin**.
>
> Rends le web un peu plus doudou. 🧸
