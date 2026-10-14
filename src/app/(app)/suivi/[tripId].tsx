import {
  IconClock,
  IconMapPin,
  IconPlayerPause,
  IconPlayerPlay,
  IconRoute,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { GoogleMaps } from "expo-maps";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type TripLocation } from "@/api";
import { Bouton, Carte, EntetePage, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import {
  estimatedDurationMinutes,
  routeCamera,
  routeDistanceKm,
} from "@/features/tracking/route-metrics";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export default function TripTrackingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const [sharing, setSharing] = useState(false);
  const [localLocation, setLocalLocation] = useState<TripLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const user = useQuery({ queryKey: ["current-user"], queryFn: () => api.getCurrentUser() });
  const isDriver = user.data?.role === "DRIVER";
  const route = useQuery({
    queryKey: ["trip-route", tripId],
    queryFn: () => api.getTripRoute(tripId!),
    enabled: Boolean(tripId && user.data),
  });
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

  if (Platform.OS !== "android") {
    return <State><MessageEtat type="erreur">Le suivi cartographique est actuellement disponible sur Android.</MessageEtat></State>;
  }

  const location = isDriver ? localLocation : remote.data;
  const stops = route.data?.tripStops
    .map((tripStop) => tripStop.stop)
    .filter((stop) => stop.latitude !== null && stop.longitude !== null) ?? [];
  const points = stops.map((stop) => ({ latitude: stop.latitude!, longitude: stop.longitude! }));
  const distance = routeDistanceKm(points);
  const duration = estimatedDurationMinutes(distance);
  const loading = user.isPending || route.isPending || (!isDriver && remote.isPending);
  const queryError = user.error ?? route.error ?? remote.error;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <EntetePage
          title="Suivi du trajet"
          description={isDriver ? "Partage au premier plan, uniquement pendant le trajet." : "Position du chauffeur et points de rencontre de l’itinéraire."}
        />
        {loading ? <MessageEtat>Chargement de l’itinéraire…</MessageEtat> : null}
        {queryError ? <MessageEtat type="erreur">{messageErreur(queryError)}</MessageEtat> : null}
        {!loading && !queryError && points.length >= 2 ? (
          <>
            <Carte style={styles.summary}>
              <View style={styles.metric}>
                <IconRoute color={couleurs.texte} size={20} />
                <Text style={styles.metricValue}>{distance.toFixed(1)} km</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.metric}>
                <IconClock color={couleurs.texte} size={20} />
                <Text style={styles.metricValue}>≈ {duration} min</Text>
              </View>
              <Text style={styles.estimate}>Estimation hors circulation en temps réel</Text>
            </Carte>
            <View style={styles.mapFrame}>
              <GoogleMaps.View
                style={styles.map}
                cameraPosition={location ? { coordinates: { latitude: location.latitude, longitude: location.longitude }, zoom: 14 } : routeCamera(points)}
                markers={[
                  ...stops.map((stop, index) => ({
                    id: stop.id,
                    coordinates: { latitude: stop.latitude!, longitude: stop.longitude! },
                    title: `${index + 1}. ${stop.name}`,
                    snippet: stop.meetingInstructions ?? "Point de rencontre",
                    showCallout: true,
                  })),
                  ...(location ? [{ id: "driver", coordinates: { latitude: location.latitude, longitude: location.longitude }, title: "Chauffeur", snippet: "Position actuelle", showCallout: true, zIndex: 10 }] : []),
                ]}
                polylines={[{ id: "route", coordinates: points, color: couleurs.encre, width: 5 }]}
                uiSettings={{ compassEnabled: true, myLocationButtonEnabled: false, mapToolbarEnabled: false }}
              />
            </View>
            {!location ? (
              <MessageEtat>{isDriver ? "Démarrez le partage pour afficher votre position." : "Le chauffeur n’a pas encore partagé sa position."}</MessageEtat>
            ) : null}
            <Carte style={styles.meetingCard}>
              <Text style={styles.meetingTitle}>Points de rencontre</Text>
              {stops.map((stop, index) => (
                <View key={stop.id} style={styles.stopRow}>
                  <View style={styles.stopIndex}><Text style={styles.stopIndexText}>{index + 1}</Text></View>
                  <View style={styles.stopCopy}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={styles.stopInstruction}>{stop.meetingInstructions ?? "Consigne à confirmer"}</Text>
                  </View>
                </View>
              ))}
            </Carte>
          </>
        ) : !loading && !queryError ? (
          <Carte style={styles.empty}>
            <IconMapPin color={couleurs.texteSecondaire} size={28} />
            <Text style={styles.emptyTitle}>Itinéraire indisponible</Text>
            <Text style={styles.emptyCopy}>Les coordonnées des arrêts ne sont pas encore renseignées.</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

function State({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.page}><View style={styles.content}><EntetePage title="Suivi du trajet" description="Position du véhicule pendant la course." />{children}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: { padding: espacements.lg, paddingBottom: espacements.xxl, gap: espacements.md },
  summary: { flexDirection: "row", alignItems: "center", gap: espacements.md },
  metric: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  metricValue: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900" },
  divider: { width: 1, height: 24, backgroundColor: couleurs.bordure },
  estimate: { flex: 1, color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, lineHeight: 15, textAlign: "right" },
  mapFrame: { height: 330, overflow: "hidden", borderRadius: rayons.xl, borderWidth: 1, borderColor: couleurs.bordure },
  map: { flex: 1 },
  meetingCard: { gap: espacements.md },
  meetingTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900" },
  stopRow: { flexDirection: "row", alignItems: "flex-start", gap: espacements.md },
  stopIndex: { width: 24, height: 24, borderRadius: rayons.rond, backgroundColor: couleurs.primaire, alignItems: "center", justifyContent: "center" },
  stopIndexText: { color: couleurs.encre, fontSize: taillesTexte.micro, fontWeight: "900" },
  stopCopy: { flex: 1, gap: 2 },
  stopName: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" },
  stopInstruction: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 19 },
  empty: { alignItems: "center", gap: espacements.sm, paddingVertical: espacements.xl },
  emptyTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900" },
  emptyCopy: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 19, textAlign: "center" },
});
