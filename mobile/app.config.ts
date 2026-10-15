import type { ConfigContext, ExpoConfig } from "expo/config";
import app from "./app.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = app.expo as ExpoConfig;
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

  return {
    ...config,
    ...base,
    extra: {
      ...base.extra,
      googleMapsConfigured: Boolean(googleMapsApiKey),
    },
    android: {
      ...base.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
      ...(googleMapsApiKey
        ? { config: { googleMaps: { apiKey: googleMapsApiKey } } }
        : {}),
    },
  };
};
