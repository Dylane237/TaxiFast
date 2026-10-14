import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

const corridorSeedSchema = z.object({
  name: z.string().trim().min(1),
  stops: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        meetingInstructions: z.string().trim().min(1),
      }),
    )
    .min(2),
});

export const corridorSeeds = z.array(corridorSeedSchema).parse([
  {
    name: "Bonabéri – Bonanjo",
    stops: [
      { name: "Bonabéri Centre", latitude: 4.079, longitude: 9.6666, meetingInstructions: "Devant la mairie de Douala IV, côté stationnement." },
      { name: "Pont du Wouri", latitude: 4.07222, longitude: 9.69389, meetingInstructions: "À l'arrêt aménagé côté Bonabéri, hors de la chaussée." },
      { name: "Rond-point Deïdo", latitude: 4.0642, longitude: 9.70687, meetingInstructions: "Près de La Nouvelle Liberté, côté stationnement." },
      { name: "Bessengué", latitude: 4.0517, longitude: 9.70811, meetingInstructions: "À l'arrêt situé près de la gare de Bessengué." },
      { name: "Akwa", latitude: 4.05106, longitude: 9.69675, meetingInstructions: "Devant Akwa Palace, côté boulevard de la Liberté." },
      { name: "Bonanjo", latitude: 4.04302, longitude: 9.6865, meetingInstructions: "Devant la Poste centrale de Bonanjo." },
    ],
  },
  {
    name: "Ndokoti – PK 14",
    stops: [
      { name: "Carrefour Ndokoti", latitude: 4.04345, longitude: 9.74248, meetingInstructions: "Devant TotalEnergies Ndokoti, à l'écart du carrefour." },
      { name: "Logbaba", latitude: 4.03285, longitude: 9.76032, meetingInstructions: "Devant la mairie de Douala III, côté stationnement." },
      { name: "Ndogpassi", latitude: 4.02824, longitude: 9.77167, meetingInstructions: "À l'entrée de Ndogpassi, au point de stationnement." },
      { name: "PK 10", latitude: 4.05635, longitude: 9.7743, meetingInstructions: "Devant le marché PK 10, côté stationnement." },
      { name: "Marché PK 14", latitude: 4.0794, longitude: 9.8004, meetingInstructions: "À l'entrée principale du marché PK 14." },
    ],
  },
]);

export async function seedCorridors(prisma: PrismaClient): Promise<void> {
  for (const corridorSeed of corridorSeeds) {
    await prisma.$transaction(async (tx) => {
      const corridor = await tx.corridor.upsert({
        where: { name: corridorSeed.name },
        update: {},
        create: { name: corridorSeed.name },
      });

      for (const [position, stop] of corridorSeed.stops.entries()) {
        await tx.stop.upsert({
          where: {
            corridorId_position: {
              corridorId: corridor.id,
              position,
            },
          },
          update: stop,
          create: {
            corridorId: corridor.id,
            position,
            ...stop,
          },
        });
      }
    });
  }
}
