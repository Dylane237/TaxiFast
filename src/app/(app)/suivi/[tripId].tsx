import { IconMapPin, IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { GoogleMaps } from "expo-maps";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type TripLocation } from "@/api";
import { Bouton, Carte, EntetePage, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export default function TripTrackingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const [sharing, setSharing] = useState(false);
  const [localLocation, setLocalLocation] = useState<TripLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const user = useQuery({ queryKey: ["current-user"], queryFn: () => api.getCurrentUser() });
  const isDriver = user.data?.role === "DRIVER";
  const remote = useQuery({
    queryKey: ["trip-location", tripId],
    queryFn: () => api.getTripLocation(tripId!),
    enabled: Boolean(tripId) && user.data?.role === "CLIENT",
    refetchInterval: 10_000,
  });
  const publish = useMutation({
    mutationFn: (location: Location.LocationObject) => api.updateTripLocation(tripId!, {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      heading: location.coords.heading,
    }),
    onSuccess: setLocalLocation,
  });

  const stopSharing = () => {
    subscription.current?.remove();
    subscription.current = null;
    setSharing(false);
  };

  const startSharing = async () => {
    setLocationError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) throw new Error("La permission de localisation est nécessaire.");
    const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    publish.mutate(first);
    subscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 10_000, distanceInterval: 25 },
      (location) => publish.mutate(location),
    );
    setSharing(true);
  };

  useEffect(() => () => subscription.current?.remove(), []);

  const location = isDriver ? localLocation : remote.data;
  if (Platform.OS !== "android") {
    return <State><MessageEtat type="erreur">Le suivi cartographique est actuellement disponible sur Android.</MessageEtat></State>;
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <EntetePage title="Suivi du trajet" description={isDriver ? "Partage au premier plan, uniquement pendant le trajet." : "Position du chauffeur, actualisée automatiquement."} />
        {user.isPending || (!isDriver && remote.isPending) ? <MessageEtat>Chargement de la position…</MessageEtat> : null}
        {user.isError || remote.isError ? <MessageEtat type="erreur">{messageErreur(user.error ?? remote.error)}</MessageEtat> : null}
        {location ? (
          <View style={styles.mapFrame}>
            <GoogleMaps.View
              style={styles.map}
              cameraPosition={{ coordinates: { latitude: location.latitude, longitude: location.longitude }, zoom: 16 }}
              markers={[{ id: "driver", coordinates: { latitude: location.latitude, longitude: location.longitude }, title: "Chauffeur", snippet: "Position actuelle", showCallout: true }]}
              uiSettings={{ compassEnabled: true, myLocationButtonEnabled: false, mapToolbarEnabled: false }}
            />
          </View>
        ) : !user.isPending && !remote.isPending ? (
          <Carte style={styles.empty}>
            <IconMapPin color={couleurs.texteSecondaire} size={28} />
            <Text style={styles.emptyTitle}>{isDriver ? "Partage inactif" : "Position indisponible"}</Text>
            <Text style={styles.emptyCopy}>{isDriver ? "Démarrez le partage quand vous prenez la route." : "Le chauffeur n’a pas encore commencé à partager sa position."}</Text>
          </Carte>
        ) : null}
        {publish.isError || locationError ? <MessageEtat type="erreur">{locationError ?? messageErreur(publish.error)}</MessageEtat> : null}
        {isDriver ? (
          <Bouton
            variante={sharing ? "secondaire" : "primaire"}
            icone={sharing ? <IconPlayerPause color={couleurs.texte} size={20} /> : <IconPlayerPlay color={couleurs.texte} size={20} />}
            chargement={publish.isPending}
            onPress={() => sharing ? stopSharing() : void startSharing().catch((error: unknown) => {
              setLocationError(error instanceof Error ? error.message : "Impossible d’activer la localisation.");
            })}
          >
            {sharing ? "Arrêter le partage" : "Partager ma position"}
          </Bouton>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function State({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.page}><View style={styles.content}><EntetePage title="Suivi du trajet" description="Position du véhicule pendant la course." />{children}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: { flex: 1, padding: espacements.lg, paddingBottom: espacements.xxl, gap: espacements.md },
  mapFrame: { flex: 1, minHeight: 360, overflow: "hidden", borderRadius: rayons.xl, borderWidth: 1, borderColor: couleurs.bordure },
  map: { flex: 1 },
  empty: { alignItems: "center", gap: espacements.sm, paddingVertical: espacements.xl },
  emptyTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900" },
  emptyCopy: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 19, textAlign: "center" },
});
