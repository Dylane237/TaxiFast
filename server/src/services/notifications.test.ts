import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpoPushNotifier } from "./notifications.js";

afterEach(() => vi.unstubAllGlobals());

describe("ExpoPushNotifier", () => {
  it("déduplique les destinataires et ignore les jetons invalides", async () => {
    const prisma = {
      pushDevice: {
        findMany: vi.fn().mockResolvedValue([
          { token: "ExpoPushToken[valid]" },
          { token: "jeton-invalide" },
        ]),
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await new ExpoPushNotifier(prisma as unknown as PrismaClient).notifyUsers(
      ["user-1", "user-1"],
      { title: "Trajet", body: "Une mise à jour", data: { url: "/mes-demandes" } },
    );

    expect(prisma.pushDevice.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ["user-1"] }, enabled: true },
      select: { token: true },
    });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual([
      expect.objectContaining({ to: "ExpoPushToken[valid]", channelId: "trajets" }),
    ]);
  });
});
