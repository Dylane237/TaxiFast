import { IconMapPin, IconRoute } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Trip, type TripStatus } from "@/api";
import { Bouton, Carte, EntetePage, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

const statuts: Record<TripStatus, string> = {
  OPEN: "Ouvert",
  FULL: "Complet",
  CLOSED: "Clos",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

function formaterDepart(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CarteTrajet({ trip, corridorName }: { trip: Trip; corridorName: string }) {
  const first = trip.tripStops[0]?.stop.name ?? "Départ";
  const last = trip.tripStops.at(-1)?.stop.name ?? "Arrivée";
  return (
    <Carte style={styles.carte}>
      <View style={styles.carteEntete}>
        <View style={styles.axe}>
          <IconRoute color={couleurs.primaire} size={20} />
          <Text style={styles.axeNom} numberOfLines={2}>{corridorName}</Text>
        </View>
        <View style={[styles.statut, trip.status === "FULL" && styles.statutAttention, ["CLOSED", "COMPLETED", "CANCELLED"].includes(trip.status) && styles.statutNeutre]}>
          <Text style={[styles.statutTexte, trip.status === "FULL" && styles.statutTexteAttention, ["CLOSED", "COMPLETED", "CANCELLED"].includes(trip.status) && styles.statutTexteNeutre]}>{statuts[trip.status]}</Text>
        </View>
      </View>
      <Text style={styles.depart}>{formaterDepart(trip.departureAt)}</Text>
      <View style={styles.troncon}>
        <IconMapPin color={couleurs.texteSecondaire} size={18} />
        <Text style={styles.tronconTexte}>{first} → {last}</Text>
      </View>
      <Text style={styles.details}>{trip.tripStops.length} arrêts · {trip.capacity} place{trip.capacity > 1 ? "s" : ""}</Text>
    </Carte>
  );
}

export default function MesTrajets() {
  const tripsQuery = useQuery({ queryKey: ["driver-trips"], queryFn: () => api.listDriverTrips() });
  const corridorsQuery = useQuery({ queryKey: ["corridors"], queryFn: () => api.listCorridors() });
  const pending = tripsQuery.isPending || corridorsQuery.isPending;
  const refreshing = tripsQuery.isRefetching || corridorsQuery.isRefetching;
  const error = tripsQuery.error ?? corridorsQuery.error;
  const corridorsById = new Map((corridorsQuery.data ?? []).map((corridor) => [corridor.id, corridor.name]));
  const trips = [...(tripsQuery.data ?? [])].sort((a, b) => b.departureAt.localeCompare(a.departureAt));

  const refresh = async () => {
    await Promise.all([tripsQuery.refetch(), corridorsQuery.refetch()]);
  };

  if (pending) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.contenuEtat}>
          <EntetePage title="Mes trajets" description="Retrouvez les trajets que vous avez publiés." />
          <MessageEtat>Chargement de vos trajets…</MessageEtat>
        </View>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.contenuEtat}>
          <EntetePage title="Mes trajets" description="Retrouvez les trajets que vous avez publiés." />
          <MessageEtat type="erreur">{messageErreur(error)}</MessageEtat>
          <Bouton onPress={() => void refresh()}>Réessayer</Bouton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <FlatList
        data={trips}
        keyExtractor={(trip) => trip.id}
        renderItem={({ item }) => <CarteTrajet trip={item} corridorName={corridorsById.get(item.corridorId) ?? "Axe"} />}
        contentContainerStyle={[styles.liste, !trips.length && styles.listeVide]}
        ListHeaderComponent={<EntetePage title="Mes trajets" description="Statut et itinéraire de chaque publication." />}
        ListHeaderComponentStyle={styles.enteteListe}
        ListEmptyComponent={<View style={styles.vide}><IconRoute color={couleurs.texteSecondaire} size={40} /><MessageEtat>Vous n’avez encore publié aucun trajet.</MessageEtat></View>}
        ItemSeparatorComponent={() => <View style={styles.separateur} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={couleurs.primaire} colors={[couleurs.primaire]} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  contenuEtat: { flex: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.lg },
  liste: { padding: espacements.lg, paddingBottom: espacements.xxl },
  listeVide: { flexGrow: 1 },
  enteteListe: { marginBottom: espacements.xl },
  separateur: { height: espacements.md },
  vide: { flex: 1, alignItems: "center", justifyContent: "center", gap: espacements.md },
  carte: { gap: espacements.md },
  carteEntete: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: espacements.md },
  axe: { flex: 1, flexDirection: "row", alignItems: "center", gap: espacements.sm },
  axeNom: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "800" },
  statut: { paddingHorizontal: espacements.sm, paddingVertical: espacements.xs, borderRadius: rayons.rond, backgroundColor: couleurs.primaireClaire },
  statutAttention: { backgroundColor: couleurs.attentionClaire },
  statutNeutre: { backgroundColor: couleurs.fond },
  statutTexte: { color: couleurs.primaire, fontSize: taillesTexte.petit, fontWeight: "800" },
  statutTexteAttention: { color: couleurs.attention },
  statutTexteNeutre: { color: couleurs.texteSecondaire },
  depart: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "700", textTransform: "capitalize" },
  troncon: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  tronconTexte: { flex: 1, color: couleurs.texteSecondaire, fontSize: taillesTexte.normal },
  details: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit },
});
