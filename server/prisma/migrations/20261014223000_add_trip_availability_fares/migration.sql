-- CreateEnum
CREATE TYPE "AvailabilityMode" AS ENUM ('IMMEDIATE', 'SCHEDULED');

-- AlterTable
ALTER TABLE "Trip"
ADD COLUMN "availableUntil" TIMESTAMP(3),
ADD COLUMN "availabilityMode" "AvailabilityMode" NOT NULL DEFAULT 'SCHEDULED';

-- CreateTable
CREATE TABLE "TripFare" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fromStopId" TEXT NOT NULL,
    "toStopId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "TripFare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripFare_tripId_fromStopId_toStopId_key" ON "TripFare"("tripId", "fromStopId", "toStopId");
CREATE INDEX "TripFare_tripId_idx" ON "TripFare"("tripId");

-- AddForeignKey
ALTER TABLE "TripFare" ADD CONSTRAINT "TripFare_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripFare" ADD CONSTRAINT "TripFare_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripFare" ADD CONSTRAINT "TripFare_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
