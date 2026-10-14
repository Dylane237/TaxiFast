import { IconArrowDown, IconArrowUp, IconMapPin, IconPlayerStop, IconRadar, IconUsers } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import { Bouton, Carte, EntetePage, MessageEtat } from "@/components";
import { buildTripTimeline, parseTripId, type StopTimelineItem } from "@/features/active-trip/active-trip";
import { messageErreur } from "@/features/auth/message-erreur";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

function PassengerNames({ names, direction }: { names: string[]; direction: "in" | "out" }) {
  if (!names.length) return null;
  const Icon = direction === "in" ? IconArrowDown : IconArrowUp;
  return (
    <View style={styles.movement}>
      <View style={[styles.movementIcon, direction === "out" && styles.movementIconOut]}>
        <Icon color={direction === "in" ? couleurs.succes : couleurs.attention} size={17} />
      </View>
      <Text style={styles.movementText}>{direction === "in" ? "Monte" : "Descend"} : {names.join(", ")}</Text>
    </View>
  );
}

function StopCard({ item, index, nextStopName }: { item: StopTimelineItem; index: number; nextStopName?: string }) {
  return (
    <View style={styles.stopRow}>
      <View style={styles.timeline}>
        <View style={styles.stopNumber}><Text style={styles.stopNumberText}>{index + 1}</Text></View>
        {nextStopName ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.stopContent}>
        <Text style={styles.stopName}>{item.tripStop.stop.name}</Text>
        {!item.boarding.length && !item.leaving.length ? (
          <Text style={styles.noMovement}>Aucun mouvement de passager</Text>
        ) : (
          <View style={styles.movements}>
            <PassengerNames names={item.boarding} direction="in" />
            <PassengerNames names={item.leaving} direction="out" />
          </View>
        )}
        {nextStopName && item.availableAfter !== null ? (
          <View style={styles.leg}>
            <View style={styles.legHeader}>
              <Text style={styles.legLabel}>TRONÇON SUIVANT</Text>
              <Text style={styles.available}>{item.availableAfter} place{item.availableAfter > 1 ? "s" : ""} libre{item.availableAfter > 1 ? "s" : ""}</Text>
            </View>
            <Text style={styles.legRoute}>{item.tripStop.stop.name} → {nextStopName}</Text>
            <Text style={styles.occupied}>{item.occupiedAfter} passager{item.occupiedAfter !== 1 ? "s" : ""} à bord</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function ActiveTripDetailScreen() {
  const params = useLocalSearchParams<{ tripId?: string | string[] }>();
  const tripId = parseTripId(params.tripId);
  const queryClient = useQueryClient();
  const manifestQuery = useQuery({
    queryKey: ["trip-manifest", tripId],
    queryFn: () => api.getTripManifest(tripId!),
    enabled: Boolean(tripId),
  });
  const closeMutation = useMutation({
    mutationFn: () => api.closeTrip(tripId!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["driver-trips"] }),
        queryClient.invalidateQueries({ queryKey: ["driver-bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["trip-manifest", tripId] }),
      ]);
    },
  });

  const confirmClose = () => {
    Alert.alert(
      "Clore ce trajet ?",
      "Le trajet et ses réservations confirmées passeront dans l’historique.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Clore le trajet", style: "destructive", onPress: () => closeMutation.mutate() },
      ],
    );
  };

  if (!tripId) {
    return <StatePage><MessageEtat type="erreur">Identifiant de trajet invalide.</MessageEtat></StatePage>;
  }

  if (manifestQuery.isPending) {
    return <StatePage><MessageEtat>Préparation de la feuille de route…</MessageEtat></StatePage>;
  }

  if (manifestQuery.isError) {
    return (
      <StatePage>
        <MessageEtat type="erreur">{messageErreur(manifestQuery.error)}</MessageEtat>
        <Bouton onPress={() => void manifestQuery.refetch()}>Réessayer</Bouton>
      </StatePage>
    );
  }

  if (closeMutation.isSuccess) {
    return (
      <StatePage>
        <MessageEtat type="succes">Trajet clôturé. Les réservations sont maintenant dans l’historique.</MessageEtat>
        <Bouton onPress={() => router.replace("../trajet-en-cours")}>Retour aux trajets</Bouton>
      </StatePage>
    );
  }

  const manifest = manifestQuery.data;
  const timeline = buildTripTimeline(manifest);
  const first = manifest.trip.tripStops[0]?.stop.name ?? "Départ";
  const last = manifest.trip.tripStops.at(-1)?.stop.name ?? "Arrivée";

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <FlatList
        data={timeline}
        keyExtractor={(item) => item.tripStop.id}
        renderItem={({ item, index }) => (
          <StopCard item={item} index={index} nextStopName={timeline[index + 1]?.tripStop.stop.name} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <EntetePage title="Trajet en cours" description="Feuille de route et occupation réelle par tronçon." />
            <Carte style={styles.summary}>
              <View style={styles.summaryIcon}><IconMapPin color={couleurs.texte} size={22} /></View>
              <View style={styles.summaryText}>
                <Text style={styles.summaryRoute}>{first} → {last}</Text>
                <View style={styles.passengerCount}>
                  <IconUsers color={couleurs.texteSecondaire} size={18} />
                  <Text style={styles.summaryDetails}>{manifest.passengers.length} passager{manifest.passengers.length !== 1 ? "s" : ""} confirmé{manifest.passengers.length !== 1 ? "s" : ""}</Text>
                </View>
              </View>
            </Carte>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {closeMutation.isError ? <MessageEtat type="erreur">{messageErreur(closeMutation.error)}</MessageEtat> : null}
            <Bouton
              variante="secondaire"
              icone={<IconRadar color={couleurs.texte} size={20} />}
              onPress={() => router.push({ pathname: "/suivi/[tripId]", params: { tripId } } as never)}
            >
              Partager ma position
            </Bouton>
            <Bouton
              variante="sombre"
              icone={<IconPlayerStop color={couleurs.surface} size={20} />}
              chargement={closeMutation.isPending}
              onPress={confirmClose}
            >
              Clore le trajet
            </Bouton>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

function StatePage({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.stateContent}>
        <EntetePage title="Trajet en cours" description="Suivez vos passagers arrêt par arrêt." />
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  list: { padding: espacements.lg, paddingBottom: espacements.xxl },
  header: { gap: espacements.xl, marginBottom: espacements.xl },
  summary: { padding: espacements.lg, flexDirection: "row", alignItems: "center", gap: espacements.md },
  summaryIcon: { width: 46, height: 46, borderRadius: rayons.md, backgroundColor: couleurs.primaire, alignItems: "center", justifyContent: "center" },
  summaryText: { flex: 1, gap: espacements.sm },
  summaryRoute: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900" },
  passengerCount: { flexDirection: "row", alignItems: "center", gap: espacements.xs },
  summaryDetails: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit },
  stopRow: { flexDirection: "row", gap: espacements.md },
  timeline: { width: 38, alignItems: "center" },
  stopNumber: { width: 36, height: 36, borderRadius: rayons.rond, backgroundColor: couleurs.encre, alignItems: "center", justifyContent: "center", zIndex: 1 },
  stopNumberText: { color: couleurs.surface, fontSize: taillesTexte.petit, fontWeight: "900" },
  line: { flex: 1, width: 2, minHeight: 110, backgroundColor: couleurs.bordure },
  stopContent: { flex: 1, paddingBottom: espacements.lg, gap: espacements.sm },
  stopName: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900", minHeight: 36, textAlignVertical: "center" },
  noMovement: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit },
  movements: { gap: espacements.xs },
  movement: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  movementIcon: { width: 28, height: 28, borderRadius: rayons.rond, backgroundColor: couleurs.succesClaire, alignItems: "center", justifyContent: "center" },
  movementIconOut: { backgroundColor: couleurs.attentionClaire },
  movementText: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "700" },
  leg: { marginTop: espacements.sm, borderRadius: rayons.md, backgroundColor: couleurs.surface, padding: espacements.md, gap: espacements.xs },
  legHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacements.sm },
  legLabel: { color: couleurs.texteSecondaire, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  available: { color: couleurs.succes, fontSize: taillesTexte.petit, fontWeight: "900" },
  legRoute: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" },
  occupied: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit },
  footer: { paddingTop: espacements.md, gap: espacements.md },
  stateContent: { flex: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.lg },
});
