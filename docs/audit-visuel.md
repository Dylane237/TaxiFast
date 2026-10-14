# Audit visuel mobile

Référence : interface Android compacte, contrastée, utilisable rapidement et adaptée aux appareils d’entrée de gamme.

## Fondations communes

- Palette jaune, encre et surfaces neutres conservée sur toute l’application.
- Échelle resserrée : marges 16 px, cartes 18 px, titres de page 23 px, texte courant 16 px.
- Cibles tactiles de 48 à 50 px pour les champs et actions principales.
- Un seul composant pour les états chargement, vide et erreur.
- Animations limitées aux transitions courtes et désactivables par le réglage système.

## Écrans audités

| Parcours | Écrans | Résultat |
| --- | --- | --- |
| Authentification | connexion, code, rôle, profil | Hero raccourci, feuille et formulaire plus compacts |
| Accueil | accueil client et chauffeur | Hiérarchie réduite, action principale et accès secondaire clairement séparés |
| Publication chauffeur | Je pars, mes trajets, modification | Sections, arrêts, horaires et capacité alignés sur la même échelle |
| Demandes chauffeur | liste, détail | Cartes compactes et états uniformisés |
| Trajet actif | liste, feuille de route, suivi | Densité renforcée, occupation par tronçon conservée lisible |
| Recherche client | recherche, attente, modification | Choix tactiles et messages d’aide homogènes |
| Offres client | trajets compatibles, offres, détail | Prix, chauffeur et actions ordonnés par importance |
| Réservation | confirmation et suivi | Informations essentielles regroupées avant les actions |
| Après-course | historique, détail, notation, portefeuille | Cartes et montants alignés sur les mêmes styles |
| Compte | profil, véhicule, notifications, menu latéral | Navigation secondaire retirée de l’accueil et regroupée dans le compte |

## Validation restante sur appareil

- Contrôler les retours à la ligne sur un écran Android étroit.
- Vérifier le clavier numérique et le défilement des formulaires.
- Vérifier la carte native et les permissions dans une development build.
- Tester une taille de police Android augmentée à 130 %.
