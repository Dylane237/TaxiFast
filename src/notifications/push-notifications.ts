import { ApiError, api } from "@/api";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PUSH_TOKEN_KEY = "covoiturage-taxi.push-token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("trajets", {
    name: "Trajets et réservations",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#FFD33D",
  });
}

function projectId(): string {
  const value = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (typeof value !== "string" || !value) {
    throw new ApiError(
      "INVALID_INPUT",
      "Le projet EAS doit être configuré avant d’activer les notifications.",
    );
  }
  return value;
}

export async function notificationsEnabled(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (!token) return false;
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.granted;
}

export async function enablePushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    throw new ApiError(
      "INVALID_INPUT",
      "Les notifications push doivent être activées sur un téléphone physique.",
    );
  }
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new ApiError(
      "FORBIDDEN",
      "Autorisez les notifications dans les réglages du téléphone.",
    );
  }
  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId: projectId() })
  ).data;
  await api.registerPushDevice({
    token,
    platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
  });
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

export async function disablePushNotifications(): Promise<void> {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (token) await api.unregisterPushDevice(token);
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

function openNotification(response: Notifications.NotificationResponse): void {
  const url = response.notification.request.content.data?.url;
  if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) {
    router.push(url as Href);
  }
}

export function subscribeToNotificationNavigation(): () => void {
  const lastResponse = Notifications.getLastNotificationResponse();
  if (lastResponse) openNotification(lastResponse);
  const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
  return () => subscription.remove();
}
