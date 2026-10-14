-- Les champs restent optionnels pour préserver les arrêts déjà enregistrés.
ALTER TABLE "Stop"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "meetingInstructions" TEXT;
