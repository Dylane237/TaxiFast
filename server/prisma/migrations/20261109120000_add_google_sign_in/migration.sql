-- Connexion avec Google : on ajoute seulement des colonnes, rien n'est supprimé.
-- Les comptes existants, créés par SMS, gardent telephoneVerifie = true.
ALTER TABLE "User" ADD COLUMN "googleId" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "telephoneVerifie" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
