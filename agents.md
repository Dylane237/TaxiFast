# Projet : covoiturage-taxi (Cameroun)

Application Android où des chauffeurs de taxi publient un trajet sur un axe prédéfini
(arrêts nommés) et des clients proposent un trajet avec un prix. Les deux parties
doivent accepter chaque réservation. Un client peut monter et descendre en cours de route.

## Stack
- server/ : Node 22, TypeScript strict, Fastify 5, Prisma 6, PostgreSQL, Zod, Vitest
- mobile/ : React Native + Expo (pas encore créé)

## Règles
- Ne modifie pas prisma/schema.prisma sans me le demander et m'expliquer pourquoi.
- Pas de compteur de places dans Trip. La capacité se vérifie par tronçon
  (voir src/capacity.ts) dans une transaction avec verrou de ligne sur le trajet.
- Valide toutes les entrées avec Zod.
- Chaque fonctionnalité vient avec des tests Vitest. Lance `npm run typecheck` et `npm test`
  avant de dire que c'est terminé.
- Petits changements : une tâche à la fois, ne touche pas aux fichiers sans rapport.
- Les prix sont en FCFA, entiers.
- Explique ce que tu as fait et ce que tu n'as pas pu vérifier.

## mobile/
- React Native + Expo (TypeScript strict), expo-router, TanStack Query, Zustand.
- Les écrans passent TOUJOURS par src/api (interface Api). Jamais de fetch dans un écran.
- Application légère : pas d'animations lourdes, listes avec FlatList, images minimales.
  Les téléphones cibles sont des Android d'entrée de gamme.
- Textes en français, prix en FCFA (entiers, format 1 500 FCFA).
- Chaque écran gère 4 états : chargement, vide, erreur, succès.
- Lance `npx tsc --noEmit` avant de dire que c'est terminé.
