# Marque — Un web de gentil 🧸

Le **nounours** est la marque du projet. Fond miel (`#F4A93B`), tête brune
(`#A86A35`), museau crème (`#FFF1D6`), yeux/nez (`#3A2A1E`).

## Fichiers
- `avatar-512.png` / `avatar-1024.png` — avatar plein cadre (réseaux, GitHub).
  Propre en cercle **et** en carré arrondi.
- Icônes de l'extension : `../icons/icon{16,32,48,128}.png`.

## Régénérer (sans dépendance)
```
node tools/make-avatar.cjs   # -> brand/avatar-512.png + avatar-1024.png
node tools/make-icons.cjs    # -> icons/icon{16,32,48,128}.png
```

## Mettre l'avatar sur GitHub (PassepartoutFR)
GitHub n'a **pas d'API** pour changer la photo de profil : ça se fait à la main.
1. Ouvrir <https://github.com/settings/profile>
2. Section « Profile picture » → **Edit** → **Upload a photo…**
3. Choisir `brand/avatar-512.png`, cadrer (le cercle tombe pile), **Set new profile picture**.
