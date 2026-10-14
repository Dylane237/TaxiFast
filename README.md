# Covoiturage-taxi : projet

```
covoiturage-taxi/
  server/    API Node.js + TypeScript + Fastify + Prisma (créé)
  mobile/    application Android React Native + Expo
```

## 1. Installer les outils sur ton PC

1. **Node.js 22 LTS** : https://nodejs.org
2. **Git** : https://git-scm.com
3. **VS Code** : https://code.visualstudio.com (extensions : Prisma, ESLint, Prettier)
4. **PostgreSQL 16** : https://www.postgresql.org/download/ (retiens le mot de passe de l'utilisateur `postgres`), ou la base gratuite d'un service comme Railway
5. **Android Studio** (pour l'émulateur uniquement) : https://developer.android.com/studio

Vérifie dans un terminal : `node -v`, `npm -v`, `git --version`.

## 2. Lancer le serveur

```bash
cd server
npm install
cp .env.example .env        # puis modifie DATABASE_URL avec ton mot de passe PostgreSQL
npx prisma validate         # vérifie le schéma (non exécuté dans l'espace où le projet a été créé)
npx prisma migrate dev --name init
npm test
npm run dev                 # http://localhost:3000/health doit répondre {"status":"ok"}
```

Si `prisma validate` signale une erreur de schéma, copie-la-moi : le schéma a été reconstruit à partir de sa description, donc un ajustement est possible.

## 3. Ce qui existe déjà

- `server/prisma/schema.prisma` : schéma v2 (itinéraires, arrêts, trajets, demandes, réservations, portefeuille, notes)
- `server/src/capacity.ts` : règle de capacité par tronçon (fonction pure) avec ses tests
- `server/src/app.ts` : serveur Fastify avec la route `/health`

## 4. Lancer l'application Android

```bash
cd mobile
npx expo start
```

Le mode fictif est actif par défaut. Pour les écrans ordinaires, Expo Go suffit. Les notifications
distantes et `expo-maps` exigent une development build : `npx eas build --profile development --platform android`,
puis installe l'APK obtenu sur le téléphone. Une nouvelle compilation native n'est nécessaire que si
une dépendance ou une configuration native change ; les changements TypeScript sont ensuite servis par Metro.

## 5. Notifications et carte Android

1. Crée un projet EAS avec `npx eas init` afin d'ajouter `extra.eas.projectId`.
2. Dans Firebase, crée l'application Android `com.covoituragetaxi.mobile`, télécharge
   `google-services.json` dans `mobile/` et configure FCM v1 avec `npx eas credentials`.
3. Active Maps SDK for Android dans Google Cloud et renseigne `GOOGLE_MAPS_API_KEY`.
4. Copie `mobile/.env.example` vers `mobile/.env.local`, puis produis une nouvelle development build.

`google-services.json` est ignoré par Git. Le serveur transmet les notifications via Expo Push Service,
qui utilise les identifiants FCM v1 configurés pour la build Android.

## 6. Brancher l'application au serveur local

Le mode fictif reste activé par défaut. Pour utiliser PostgreSQL et l'API réelle :

1. Copie `server/.env.example` vers `server/.env`, renseigne `DATABASE_URL`, puis lance
   `npx prisma migrate deploy`, `npm run db:seed` et `npm run dev` depuis `server/`.
2. Copie `mobile/.env.example` vers `mobile/.env` et mets `EXPO_PUBLIC_USE_MOCK=false`.
3. Sur un téléphone physique, mets dans `EXPO_PUBLIC_API_URL` l'adresse IPv4 du PC, par exemple
   `http://192.168.1.20:3000`. Le téléphone et le PC doivent être sur le même réseau.
4. Relance Expo après toute modification des variables `EXPO_PUBLIC_*`.

En développement, `DEV_OTP_CODE=123456` fixe le code OTP. Cette variable est ignorée en
production, où un fournisseur d'envoi OTP devra être configuré.
