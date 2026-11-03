import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { IntroTaxi } from "@/features/intro/IntroTaxi";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs } from "@/theme";
import { sourcesPolices } from "@/theme/polices-sources";

// L'écran de lancement reste affiché jusqu'à ce que l'intro, qui reprend la même image, soit posée.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrated = useAuthStore((state) => state.hydrated);
  // Si une police ne charge pas, on continue avec celle du système plutôt que de bloquer l'app.
  const [policesChargees, erreurPolices] = useFonts(sourcesPolices);
  const policesPretes = policesChargees || erreurPolices != null;
  const [introVisible, setIntroVisible] = useState(true);
  const terminerIntro = useCallback(() => setIntroVisible(false), []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  useEffect(() => { void hydrate(); }, [hydrate]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          {policesPretes && (
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: couleurs.surface },
                headerTintColor: couleurs.texte,
                contentStyle: { backgroundColor: couleurs.fond },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(app)" options={{ headerShown: false }} />
            </Stack>
          )}
          {introVisible && <IntroTaxi pret={hydrated && policesPretes} onTerminee={terminerIntro} />}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
