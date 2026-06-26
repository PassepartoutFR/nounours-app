# ❓ FAQ — Un web de gentil 🧸

Les réponses courtes aux questions qu'on nous pose le plus souvent.

## Est-ce que vous lisez mes commentaires ?

**Non.** Le filtrage est 100 % **local** : tout se passe dans ton navigateur,
sur ta machine. Aucun commentaire, aucune page, aucune URL ne quitte ton écran.
Il n'y a tout simplement pas de serveur qui voit ce que tu lis.

## Sur quels sites ça marche ?

Sur **n'importe quelle page web** : réseaux sociaux, forums, sections
commentaires… L'extension lit le texte affiché et adoucit ce qui ressemble à de
la méchanceté, là où tu es. Tu peux toujours **cliquer** un message adouci pour
révéler l'original.

## C'est vraiment gratuit, pour toujours ?

**Oui.** Pas d'abonnement, pas de « premium », pas de piège. La gentillesse ne se
loue pas. Les coûts sont quasi nuls (tout tourne sur ta machine), donc rien ne
nous pousse à te faire payer. Si un jour il y a un financement, ce sera par dons
ou sponsors open source — **jamais** de pub, jamais de revente, jamais de péage
sur la gentillesse.

## Comment vous détectez la méchanceté ?

Par une **heuristique légère et faillible** : des listes de mots par langue. Ce
n'est **pas** une compréhension du contexte — c'est volontairement simple. Le
texte est normalisé (minuscules, sans accents) puis comparé aux listes. C'est
assumé : ça se trompera parfois, et c'est exactement pour ça que **tout est
réversible** et que rien n'est définitif.

## Et les faux positifs ?

Ça arrive — par exemple « je ne suis pas un idiot » peut quand même être adouci,
puisqu'il n'y a pas d'analyse du contexte. Pas de panique : **un clic sur le
message adouci révèle l'original**. Rien n'est effacé, rien n'est permanent : on
modifie seulement l'**affichage**, de ton côté, et c'est toujours annulable.

## Le classement est-il anonyme ?

**Oui.** Il est **désactivé par défaut**. Si tu choisis de le rejoindre,
l'extension génère une **identité anonyme** (un identifiant + une clé secrète) :
pas d'e-mail, pas de mot de passe. On n'envoie que `{identifiant anonyme, pseudo,
score}` — **jamais** tes commentaires ni les sites que tu visites.

## Le Miroir gentil va-t-il poster à ma place ?

Jamais. Avant que **toi** tu envoies un message dur, le Miroir te **propose** une
version plus douce de **ton** brouillon. Tu gardes toujours la main : tu peux
« envoyer quand même ». On n'écrit rien à ta place.

## Je peux contribuer une langue ?

**Oui, et c'est bienvenu !** Tout vit dans `uwg-core.js` : ajoute ta langue dans
l'objet `LEX` (les mots détectés), dans chaque thème de `BANKS` (les phrases des
mascottes), et dans `SOFT` / `SAVAGE` / `HINT`. C'est tout. Ensuite, ouvre une
**PR** : les contributions passent par des pull requests publiques. Les nouvelles
mascottes et les répliques plus drôles sont aussi les bienvenues.

## Comment je ne perds pas mon score ?

Ton identité (et donc ton score) vit dans l'extension. L'**export / import
d'identité** te permet de la sauvegarder et de la restaurer — pratique pour
changer de machine ou de navigateur sans repartir de zéro.

## C'est de la modération ou de la censure ?

**Non.** On ne supprime rien sur les serveurs des plateformes : on adoucit
l'**affichage**, de ton côté, de façon **réversible** (un clic révèle l'original).
On se moque de la **méchanceté**, pas des personnes — le ton reste tendre, jamais
haineux en retour.
