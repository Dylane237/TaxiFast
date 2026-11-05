import { IconArrowRight, IconMapPin, IconRoute } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Trip } from "@/api";
import { ApparitionListe, Bouton, Carte, EntetePage, EtatContenu, PressionDouce } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";
import { capitaliser, formatDateTime } from "@/features/format";

function ActiveTripCard({ trip }: { trip: Trip }) {
  const first = trip.tripStops[0]?.stop.name ?? "Départ";
  const last = trip.tripStops.at(-1)?.stop.name ?? "Arrivée";
  return (
    <PressionDouce
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le trajet de ${first} à ${last}`}
      onPress={() => router.push(`./trajet-en-cours/${trip.id}`)}
    >
      <Carte style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.icon}><IconRoute color={couleurs.texte} size={21} /></View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.status}>{trip.status === "FULL" ? "COMPLET" : "EN COURS"}</Text>
            <Text style={styles.departure}>{capitaliser(formatDateTime(trip.departureAt))}</Text>
          </View>
          <IconArrowRight color={couleurs.texteSecondaire} size={21} />
        </View>
        <View style={styles.segment}>
          <IconMapPin color={couleurs.texteSecondaire} size={19} />
          <Text style={styles.segmentText}>{first} → {last}</Text>
        </View>
        <Text style={styles.details}>{trip.tripStops.length} arrêts · {trip.capacity} place{trip.capacity > 1 ? "s" : ""}</Text>
      </Carte>
    </PressionDouce>
  );
}

export default function ActiveTripsScreen() {
  const tripsQuery = useQuery({ queryKey: ["driver-trips"], queryFn: () => api.listDriverTrips() });
  const trips = (tripsQuery.data ?? [])
    .filter((trip) => ["OPEN", "FULL"].includes(trip.status))
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt));

  if (tripsQuery.isPending) {
    return <StatePage><EtatContenu type="chargement" title="Chargement de vos trajets" description="On prépare votre feuille de route." /></StatePage>;
  }

  if (tripsQuery.isError) {
    return (
      <StatePage>
        <EtatContenu type="erreur" title="Impossible de charger vos trajets" description={messageErreur(tripsQuery.error)} action={<Bouton onPress={() => void tripsQuery.refetch()}>Réessayer</Bouton>} />
      </StatePage>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <FlatList
        data={trips}
        keyExtractor={(trip) => trip.id}
        renderItem={({ item, index }) => <ApparitionListe index={index}><ActiveTripCard trip={item} /></ApparitionListe>}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<EntetePage title="Trajet en cours" description="Qui monte, qui descend, et combien de places il reste." />}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={
          <View style={styles.empty}><EtatContenu type="vide" title="Aucun trajet en cours" description="Publiez un trajet et vos clients apparaîtront ici." /></View>
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
        <EntetePage title="Trajet en cours" description="Vos trajets du moment." />
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
  status: { color: couleurs.texteSecondaire, fontSize: 11, letterSpacing: 1.1, fontFamily: polices.texteGras },
  departure: { color: couleurs.texte, fontSize: taillesTexte.petit, textTransform: "capitalize", fontFamily: polices.texteGras },
  segment: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  segmentText: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.normal, fontFamily: polices.texteGras },
  details: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, fontFamily: polices.texte },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: espacements.md },
  stateContent: { flex: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.lg },
});
