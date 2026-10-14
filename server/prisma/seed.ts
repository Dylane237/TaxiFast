import { PrismaClient } from "@prisma/client";
import { seedCorridors } from "../src/seeds/corridors.js";

const prisma = new PrismaClient();

try {
  await seedCorridors(prisma);
  console.log("Itinéraires et arrêts de Douala créés.");
} finally {
  await prisma.$disconnect();
}
