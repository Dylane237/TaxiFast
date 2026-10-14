import { IconArrowRight, IconMapPin, IconRoute } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import { Bouton, Carte, EntetePage, EtatContenu } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { selectDriverRequests, type DriverRequest } from "@/features/driver-requests/driver-requests";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

function formatDeparture(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RequestCard({ item }: { item: DriverRequest }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Demande de ${item.pickupName} à ${item.dropoffName}`}
      onPress={() => router.push(`./demandes/${item.booking.id}`)}
    >
      <Carte style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.icon}><IconRoute color={couleurs.texte} size={20} /></View>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>DEMANDE CLIENT</Text>
            <Text style={styles.departure}>Départ {formatDeparture(item.trip.departureAt)}</Text>
          </View>
          <IconArrowRight color={couleurs.texteSecondaire} size={21} />
        </View>
        <View style={styles.segment}>
          <IconMapPin color={couleurs.texteSecondaire} size={19} />
          <Text style={styles.segmentText}>{item.pickupName} → {item.dropoffName}</Text>
        </View>
        <Text style={styles.price}>{formatPrice(item.booking.proposedPrice)}</Text>
      </Carte>
    </Pressable>
  );
}

export default function DriverRequestsScreen() {
  const tripsQuery = useQuery({ queryKey: ["driver-trips"], queryFn: () => api.listDriverTrips() });
  const bookingsQuery = useQuery({ queryKey: ["driver-bookings"], queryFn: () => api.listDriverBookings() });
  const pending = tripsQuery.isPending || bookingsQuery.isPending;
  const error = tripsQuery.error ?? bookingsQuery.error;
  const requests = selectDriverRequests(bookingsQuery.data ?? [], tripsQuery.data ?? []);
  const refreshing = tripsQuery.isRefetching || bookingsQuery.isRefetching;

  const refresh = async () => {
    await Promise.all([tripsQuery.refetch(), bookingsQuery.refetch()]);
  };

  if (pending) {
    return <StatePage><EtatContenu type="chargement" title="Chargement des demandes" description="Nous recherchons les propositions compatibles avec vos trajets." /></StatePage>;
  }

  if (error) {
    return (
      <StatePage>
        <EtatContenu type="erreur" title="Demandes indisponibles" description={messageErreur(error)} action={<Bouton onPress={() => void refresh()}>Réessayer</Bouton>} />
      </StatePage>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.booking.id}
        renderItem={({ item }) => <RequestCard item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<EntetePage title="Demandes sur mon axe" description="Propositions compatibles avec vos arrêts et vos places disponibles." />}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={
          <View style={styles.empty}><EtatContenu type="vide" title="Aucune demande pour le moment" description="Les nouvelles propositions compatibles apparaîtront ici." /></View>
        }
        contentContainerStyle={[styles.list, !requests.length && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[couleurs.primaire]} tintColor={couleurs.primaire} />}
      />
    </SafeAreaView>
  );
}

function StatePage({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.stateContent}>
        <EntetePage title="Demandes sur mon axe" description="Propositions compatibles avec vos trajets ouverts." />
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
  icon: { width: 42, height: 42, borderRadius: rayons.md, backgroundColor: couleurs.primaire, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 3 },
  kicker: { color: couleurs.texteSecondaire, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  departure: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "700", textTransform: "capitalize" },
  segment: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  segmentText: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "700" },
  price: { color: couleurs.texte, fontSize: taillesTexte.titre, fontWeight: "900" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: espacements.md },
  stateContent: { flex: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.lg },
});
