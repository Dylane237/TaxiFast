# Audit visuel mobile

Référence : interface Android compacte, contrastée, utilisable rapidement et adaptée aux appareils d’entrée de gamme.

## Fondations communes

- Palette jaune, encre et surfaces neutres conservée sur toute l’application.
- Échelle resserrée : marges 16 px, cartes 14 px, titres de page 22 px, texte courant 15 px.
- Cibles tactiles de 48 px minimum pour les champs et actions principales.
- Un seul composant pour les états chargement, vide et erreur.
- Animations limitées aux transitions courtes et désactivables par le réglage système.

## Écrans audités

| Parcours | Écrans | Résultat |
| --- | --- | --- |
| Authentification | connexion, code, rôle, profil | Hero raccourci, feuille et formulaire plus compacts |
| Accueil | accueil client et chauffeur | Hiérarchie réduite, action principale et accès secondaire clairement séparés |
| Publication chauffeur | Je pars, mes trajets, modification | Itinéraire, arrêts, disponibilité, capacité et tarifs entièrement modifiables |
| Demandes chauffeur | liste, détail | Cartes compactes et états uniformisés |
| Trajet actif | liste, feuille de route, suivi | Densité renforcée, occupation par tronçon conservée lisible |
| Recherche client | recherche, attente, modification | Choix tactiles et messages d’aide homogènes |
| Offres client | trajets compatibles, offres, détail | Prix, chauffeur et actions ordonnés par importance |
| Réservation | confirmation et suivi | Informations essentielles regroupées avant les actions |
| Après-course | historique, détail, notation, portefeuille | Cartes et montants alignés sur les mêmes styles |
| Compte | profil, véhicule, notifications, menu latéral | Navigation secondaire retirée de l’accueil et regroupée dans le compte |

## Stratégie de validation

- Émulateur Pixel 7 : audit systématique, captures, clavier et défilement.
- Téléphone Android physique : GPS, permissions, fluidité et notifications.
- Taille de police Android à 130 % : contrôle final avant livraison.

## Intégrations externes

- Carte de démonstration disponible sans clé ; carte Google native activée par `GOOGLE_MAPS_API_KEY`.
- FCM préparé via `GOOGLE_SERVICES_JSON` et EAS, mais nécessite les identifiants du projet Firebase.
- Les profils EAS development, preview APK et production sont définis dans `eas.json`.
- Le mode mock reste la configuration par défaut tant qu’aucune base PostgreSQL et aucune API déployée ne sont fournies.
