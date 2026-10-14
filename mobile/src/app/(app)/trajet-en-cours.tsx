import { IconArrowRight, IconMapPin, IconRoute } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Trip } from "@/api";
import { Bouton, Carte, EntetePage, EtatContenu } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

function formatDeparture(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActiveTripCard({ trip }: { trip: Trip }) {
  const first = trip.tripStops[0]?.stop.name ?? "Départ";
  const last = trip.tripStops.at(-1)?.stop.name ?? "Arrivée";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le trajet de ${first} à ${last}`}
      onPress={() => router.push(`./trajet-en-cours/${trip.id}`)}
    >
      <Carte style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.icon}><IconRoute color={couleurs.texte} size={21} /></View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.status}>{trip.status === "FULL" ? "COMPLET" : "EN COURS"}</Text>
            <Text style={styles.departure}>{formatDeparture(trip.departureAt)}</Text>
          </View>
          <IconArrowRight color={couleurs.texteSecondaire} size={21} />
        </View>
        <View style={styles.segment}>
          <IconMapPin color={couleurs.texteSecondaire} size={19} />
          <Text style={styles.segmentText}>{first} → {last}</Text>
        </View>
        <Text style={styles.details}>{trip.tripStops.length} arrêts · {trip.capacity} place{trip.capacity > 1 ? "s" : ""}</Text>
      </Carte>
    </Pressable>
  );
}

export default function ActiveTripsScreen() {
  const tripsQuery = useQuery({ queryKey: ["driver-trips"], queryFn: () => api.listDriverTrips() });
  const trips = (tripsQuery.data ?? [])
    .filter((trip) => ["OPEN", "FULL"].includes(trip.status))
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt));

  if (tripsQuery.isPending) {
    return <StatePage><EtatContenu type="chargement" title="Chargement des trajets" description="Nous préparons vos feuilles de route actives." /></StatePage>;
  }

  if (tripsQuery.isError) {
    return (
      <StatePage>
        <EtatContenu type="erreur" title="Trajets indisponibles" description={messageErreur(tripsQuery.error)} action={<Bouton onPress={() => void tripsQuery.refetch()}>Réessayer</Bouton>} />
      </StatePage>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <FlatList
        data={trips}
        keyExtractor={(trip) => trip.id}
        renderItem={({ item }) => <ActiveTripCard trip={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<EntetePage title="Trajet en cours" description="Suivez les montées, les descentes et les places sur chaque tronçon." />}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={
          <View style={styles.empty}><EtatContenu type="vide" title="Aucun trajet actif" description="Publiez un départ pour préparer votre feuille de route." /></View>
        }
        contentContainerStyle={[styles.list, !trips.length && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={tripsQuery.isRefetching} onRefresh={() => void tripsQuery.refetch()} colors={[couleurs.primaire]} tintColor={couleurs.primaire} />}
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
  emptyList: { flexGrow: 1 },
  listHeader: { marginBottom: espacements.xl },
  separator: { height: espacements.md },
  card: { padding: espacements.lg, gap: espacements.md },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: espacements.md },
  icon: { width: 44, height: 44, borderRadius: rayons.md, backgroundColor: couleurs.primaire, alignItems: "center", justifyContent: "center" },
  cardHeaderText: { flex: 1, gap: 3 },
  status: { color: couleurs.texteSecondaire, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 },
  departure: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800", textTransform: "capitalize" },
  segment: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  segmentText: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "800" },
  details: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: espacements.md },
  stateContent: { flex: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.lg },
});
