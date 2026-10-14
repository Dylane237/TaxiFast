import type { PrismaClient } from "@prisma/client";

export type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export interface Notifier {
  notifyUsers(userIds: string[], message: PushMessage): Promise<void>;
  notifyDriversOnCorridor(corridorId: string, message: PushMessage): Promise<void>;
}

export class NoopNotifier implements Notifier {
  async notifyUsers(): Promise<void> {}
  async notifyDriversOnCorridor(): Promise<void> {}
}

export class ExpoPushNotifier implements Notifier {
  constructor(private readonly prisma: PrismaClient) {}

  async notifyDriversOnCorridor(corridorId: string, message: PushMessage): Promise<void> {
    const trips = await this.prisma.trip.findMany({
      where: { corridorId, status: { in: ["OPEN", "FULL"] } },
      distinct: ["driverId"],
      select: { driverId: true },
    });
    await this.notifyUsers(
      trips.map((trip) => trip.driverId),
      message,
    );
  }

  async notifyUsers(userIds: string[], message: PushMessage): Promise<void> {
    if (userIds.length === 0) return;
    const devices = await this.prisma.pushDevice.findMany({
      where: { userId: { in: [...new Set(userIds)] }, enabled: true },
      select: { token: true },
    });
    const messages = devices
      .filter(({ token }) => /^(Expo|Exponent)PushToken\[.+\]$/.test(token))
      .map(({ token }) => ({
        to: token,
        sound: "default",
        priority: "high",
        channelId: "trajets",
        ...message,
      }));
    if (messages.length === 0) return;

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      throw new Error(`Expo Push Service a répondu ${response.status}`);
    }
  }
}
