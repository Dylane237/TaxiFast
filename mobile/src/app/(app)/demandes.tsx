import { IconArrowRight, IconMapPin, IconRoute } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import { ApparitionListe, Bouton, Carte, EntetePage, EtatContenu, PressionDouce } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { selectDriverRequests, type DriverRequest } from "@/features/driver-requests/driver-requests";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";

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
    <PressionDouce
      accessibilityRole="button"
      accessibilityLabel={`Demande de ${item.pickupName} à ${item.dropoffName}`}
      onPress={() => router.push(`./demandes/${item.booking.id}`)}
    >
      <Carte style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.icon}><IconRoute color={couleurs.texte} size={20} /></View>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>CLIENT SUR VOTRE ROUTE</Text>
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
    </PressionDouce>
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
    return <StatePage><EtatContenu type="chargement" title="Chargement des demandes" description="On regarde qui veut monter sur vos trajets." /></StatePage>;
  }

  if (error) {
    return (
      <StatePage>
        <EtatContenu type="erreur" title="Impossible de charger les demandes" description={messageErreur(error)} action={<Bouton onPress={() => void refresh()}>Réessayer</Bouton>} />
      </StatePage>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.booking.id}
        renderItem={({ item, index }) => <ApparitionListe index={index}><RequestCard item={item} /></ApparitionListe>}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<EntetePage title="Demandes reçues" description="Des clients sur votre chemin, avec le prix qu’ils proposent." />}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={
          <View style={styles.empty}><EtatContenu type="vide" title="Pas encore de client" description="Dès qu’un client sur votre route fait une demande, elle s’affiche ici." /></View>
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
        <EntetePage title="Demandes reçues" description="Les clients qui veulent monter avec vous." />
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
  kicker: { color: couleurs.texteSecondaire, fontSize: 11, letterSpacing: 1, fontFamily: polices.texteGras },
  departure: { color: couleurs.texte, fontSize: taillesTexte.petit, textTransform: "capitalize", fontFamily: polices.texteDemiGras },
  segment: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  segmentText: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.normal, fontFamily: polices.texteDemiGras },
  price: { color: couleurs.texte, fontSize: taillesTexte.titre, fontFamily: polices.titre },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: espacements.md },
  stateContent: { flex: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.lg },
});
