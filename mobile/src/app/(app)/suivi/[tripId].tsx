import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  IconArrowLeft,
  IconClock,
  IconMapPin,
  IconPlayerPause,
  IconPlayerPlay,
  IconRoute,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { GoogleMaps } from "expo-maps";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type TripLocation } from "@/api";
import { Bouton, Carte, EntetePage, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import {
  estimatedDurationMinutes,
  routeCamera,
  routeDistanceKm,
} from "@/features/tracking/route-metrics";
import { DemoRouteMap } from "@/features/tracking/DemoRouteMap";
import { couleurs, espacements, ombres, rayons, taillesTexte } from "@/theme";

export default function TripTrackingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const [sharing, setSharing] = useState(false);
  const [localLocation, setLocalLocation] = useState<TripLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const snapPoints = useMemo(() => ["28%", "57%", "90%"], []);
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
  const mapsConfigured = Constants.expoConfig?.extra?.googleMapsConfigured === true;
  const distance = routeDistanceKm(points);
  const duration = estimatedDurationMinutes(distance);
  const loading = user.isPending || route.isPending || (!isDriver && remote.isPending);
  const queryError = user.error ?? route.error ?? remote.error;

  if (loading) return <State><MessageEtat>Chargement de l’itinéraire…</MessageEtat></State>;
  if (queryError) return <State><MessageEtat type="erreur">{messageErreur(queryError)}</MessageEtat></State>;
  if (points.length < 2) {
    return (
      <State>
        <Carte style={styles.empty}>
          <IconMapPin color={couleurs.texteSecondaire} size={28} />
          <Text style={styles.emptyTitle}>Itinéraire indisponible</Text>
          <Text style={styles.emptyCopy}>Les coordonnées des arrêts ne sont pas encore renseignées.</Text>
        </Carte>
      </State>
    );
  }

  const firstStop = stops[0]!;
  const lastStop = stops.at(-1)!;
  const statusLabel = isDriver
    ? sharing ? "Position partagée" : "Partage en pause"
    : location ? "Chauffeur en route" : "En attente du chauffeur";

  return (
    <View style={styles.page}>
      {mapsConfigured ? (
        <GoogleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={routeCamera(points)}
          markers={[
            ...stops.map((stop, index) => ({
              id: stop.id,
              coordinates: { latitude: stop.latitude!, longitude: stop.longitude! },
              title: `${index + 1}. ${stop.name}`,
              snippet: stop.meetingInstructions ?? "Point de rencontre",
              showCallout: true,
              zIndex: index === 0 || index === stops.length - 1 ? 3 : 1,
            })),
            ...(location ? [{
              id: "driver",
              coordinates: { latitude: location.latitude, longitude: location.longitude },
              title: "Chauffeur",
              snippet: "Position actuelle",
              showCallout: true,
              zIndex: 10,
            }] : []),
          ]}
          polylines={[
            { id: "route-shadow", coordinates: points, color: couleurs.surface, width: 9 },
            { id: "route", coordinates: points, color: couleurs.encre, width: 5 },
          ]}
          uiSettings={{
            compassEnabled: true,
            myLocationButtonEnabled: false,
            mapToolbarEnabled: false,
            zoomControlsEnabled: false,
          }}
        />
      ) : (
        <DemoRouteMap stopCount={stops.length} />
      )}

      <SafeAreaView pointerEvents="box-none" style={styles.topLayer} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Retour"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
          >
            <IconArrowLeft color={couleurs.texte} size={22} />
          </Pressable>
          <View style={styles.livePill}>
            <View style={[styles.liveDot, location && styles.liveDotActive]} />
            <Text style={styles.liveText}>{statusLabel}</Text>
          </View>
          <View style={styles.topSpacer} />
        </View>
      </SafeAreaView>

      <BottomSheet
        index={1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHeading}>
            <View style={styles.sheetHeadingCopy}>
              <Text style={styles.eyebrow}>{isDriver ? "TRAJET EN COURS" : "SUIVI EN DIRECT"}</Text>
              <Text numberOfLines={2} style={styles.title}>{firstStop.name} vers {lastStop.name}</Text>
            </View>
            <View style={styles.etaBadge}>
              <Text style={styles.etaValue}>≈ {duration}</Text>
              <Text style={styles.etaUnit}>min</Text>
            </View>
          </View>

          <View style={styles.metrics}>
            <View style={styles.metric}>
              <IconRoute color={couleurs.texteSecondaire} size={18} />
              <Text style={styles.metricText}>{distance.toFixed(1)} km</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <IconClock color={couleurs.texteSecondaire} size={18} />
              <Text style={styles.metricText}>Hors trafic réel</Text>
            </View>
          </View>

          {!location ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                {isDriver
                  ? "Partagez votre position pour permettre aux passagers de vous suivre."
                  : "La position apparaîtra dès que le chauffeur commencera le partage."}
              </Text>
            </View>
          ) : null}
          {publish.isError || locationError ? (
            <MessageEtat type="erreur">{locationError ?? messageErreur(publish.error)}</MessageEtat>
          ) : null}
          {isDriver ? (
            <Bouton
              variante={sharing ? "secondaire" : "sombre"}
              icone={sharing
                ? <IconPlayerPause color={couleurs.texte} size={20} />
                : <IconPlayerPlay color={couleurs.surface} size={20} />}
              chargement={publish.isPending}
              onPress={() => sharing ? stopSharing() : void startSharing().catch((error: unknown) => {
                setLocationError(error instanceof Error ? error.message : "Impossible d’activer la localisation.");
              })}
            >
              {sharing ? "Arrêter le partage" : "Partager ma position"}
            </Bouton>
          ) : null}

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Points de rencontre</Text>
            <Text style={styles.stopCount}>{stops.length} arrêts</Text>
          </View>
          <View style={styles.timeline}>
            {stops.map((stop, index) => {
              const isFirst = index === 0;
              const isLast = index === stops.length - 1;
              return (
                <View key={stop.id} style={styles.stopRow}>
                  <View style={styles.timelineRail}>
                    {!isFirst ? <View style={styles.railTop} /> : null}
                    <View style={[
                      styles.stopMarker,
                      (isFirst || isLast) && styles.stopMarkerEndpoint,
                      isLast && styles.stopMarkerLast,
                    ]}>
                      <Text style={[
                        styles.stopMarkerText,
                        (isFirst || isLast) && styles.stopMarkerTextEndpoint,
                        isLast && styles.stopMarkerTextLast,
                      ]}>{index + 1}</Text>
                    </View>
                    {!isLast ? <View style={styles.railBottom} /> : null}
                  </View>
                  <View style={styles.stopCopy}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={styles.stopInstruction}>{stop.meetingInstructions ?? "Consigne à confirmer"}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

function State({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.statePage}>
      <View style={styles.stateContent}>
        <EntetePage title="Suivi du trajet" description="Position du véhicule pendant la course." />
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  statePage: { flex: 1, backgroundColor: couleurs.fond },
  stateContent: { flex: 1, padding: espacements.lg, gap: espacements.lg },
  topLayer: { position: "absolute", top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: espacements.lg, paddingTop: espacements.sm,
  },
  mapButton: {
    width: 44, height: 44, borderRadius: rayons.rond, backgroundColor: couleurs.surface,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
    borderColor: couleurs.bordure, ...ombres.carte,
  },
  topSpacer: { width: 44, height: 44 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  livePill: {
    minHeight: 40, maxWidth: "64%", borderRadius: rayons.rond,
    paddingHorizontal: espacements.md, backgroundColor: couleurs.surface,
    borderWidth: 1, borderColor: couleurs.bordure, flexDirection: "row",
    alignItems: "center", gap: espacements.sm, ...ombres.carte,
  },
  liveDot: { width: 8, height: 8, borderRadius: rayons.rond, backgroundColor: couleurs.desactive },
  liveDotActive: { backgroundColor: couleurs.succes },
  liveText: { flexShrink: 1, color: couleurs.texte, fontSize: 12, fontWeight: "800" },
  sheetBackground: {
    backgroundColor: couleurs.surface, borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl, ...ombres.feuille,
  },
  sheetHandle: { width: 42, height: 4, backgroundColor: couleurs.desactive },
  sheetContent: { paddingHorizontal: espacements.lg, paddingBottom: 46, gap: espacements.lg },
  sheetHeading: { flexDirection: "row", alignItems: "flex-start", gap: espacements.md },
  sheetHeadingCopy: { flex: 1, gap: espacements.xs },
  eyebrow: {
    color: couleurs.texteSecondaire, fontSize: taillesTexte.micro,
    fontWeight: "900", letterSpacing: 0.8,
  },
  title: { color: couleurs.texte, fontSize: 22, lineHeight: 27, fontWeight: "900" },
  etaBadge: {
    minWidth: 64, minHeight: 64, paddingHorizontal: espacements.sm,
    borderRadius: rayons.lg, backgroundColor: couleurs.primaire,
    alignItems: "center", justifyContent: "center",
  },
  etaValue: { color: couleurs.encre, fontSize: taillesTexte.normal, fontWeight: "900" },
  etaUnit: { color: couleurs.encreDouce, fontSize: taillesTexte.micro, fontWeight: "800" },
  metrics: {
    minHeight: 48, borderRadius: rayons.md, backgroundColor: couleurs.surfaceSecondaire,
    paddingHorizontal: espacements.md, flexDirection: "row", alignItems: "center",
  },
  metric: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: espacements.sm,
  },
  metricText: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" },
  metricDivider: { width: 1, height: 22, backgroundColor: couleurs.bordure },
  notice: { borderRadius: rayons.md, padding: espacements.md, backgroundColor: couleurs.primaireClaire },
  noticeText: { color: couleurs.encreDouce, fontSize: taillesTexte.petit, lineHeight: 19, fontWeight: "700" },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900" },
  stopCount: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, fontWeight: "700" },
  timeline: { paddingBottom: espacements.sm },
  stopRow: { minHeight: 68, flexDirection: "row", gap: espacements.md },
  timelineRail: { width: 28, alignItems: "center" },
  railTop: { position: "absolute", top: 0, width: 2, height: 12, backgroundColor: couleurs.bordure },
  railBottom: { position: "absolute", top: 34, bottom: 0, width: 2, backgroundColor: couleurs.bordure },
  stopMarker: {
    marginTop: 10, width: 24, height: 24, borderRadius: rayons.rond,
    backgroundColor: couleurs.surfaceSecondaire, borderWidth: 1,
    borderColor: couleurs.bordure, alignItems: "center", justifyContent: "center", zIndex: 1,
  },
  stopMarkerEndpoint: { backgroundColor: couleurs.encre, borderColor: couleurs.encre },
  stopMarkerLast: { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
  stopMarkerText: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontWeight: "900" },
  stopMarkerTextEndpoint: { color: couleurs.surface },
  stopMarkerTextLast: { color: couleurs.encre },
  stopCopy: { flex: 1, paddingTop: espacements.sm, paddingBottom: espacements.md, gap: 3 },
  stopName: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "900" },
  stopInstruction: { color: couleurs.texteSecondaire, fontSize: 12, lineHeight: 17 },
  empty: { alignItems: "center", gap: espacements.sm, paddingVertical: espacements.xl },
  emptyTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900" },
  emptyCopy: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 19, textAlign: "center" },
});
