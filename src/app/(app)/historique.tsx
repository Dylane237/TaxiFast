import {
  IconArrowRight,
  IconMapPin,
  IconStar,
} from "@tabler/icons-react-native";
import { useQueries, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type BookingDetails } from "@/api";
import { Carte, EntetePage, EtatContenu } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatDateTime, formatPrice } from "@/features/format";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

const statusLabels = {
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  REFUSED: "Refusée",
  EXPIRED: "Expirée",
} as const;

function HistoryCard({ data }: { data: BookingDetails }) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/historique/[bookingId]",
          params: { bookingId: data.booking.id },
        })
      }
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Carte style={styles.card}>
        <View style={styles.top}>
          <View style={styles.status}>
            <Text style={styles.statusText}>
              {statusLabels[data.booking.status as keyof typeof statusLabels] ??
                data.booking.status}
            </Text>
          </View>
          <Text style={styles.price}>
            {formatPrice(
              data.booking.agreedPrice ?? data.booking.proposedPrice,
            )}
          </Text>
        </View>
        <View style={styles.route}>
          <IconMapPin color={couleurs.texteSecondaire} size={18} />
          <Text style={styles.routeText}>
            {data.pickupStop.name} → {data.dropoffStop.name}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {formatDateTime(data.trip.departureAt)}
          </Text>
          {data.booking.status === "COMPLETED" && !data.ratedByCurrentUser ? (
            <View style={styles.rateBadge}>
              <IconStar color={couleurs.attention} size={15} />
              <Text style={styles.rateText}>Noter</Text>
            </View>
          ) : null}
          <IconArrowRight color={couleurs.texteSecondaire} size={19} />
        </View>
      </Carte>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const history = useQuery({
    queryKey: ["booking-history"],
    queryFn: () => api.listBookingHistory(),
  });
  const detailQueries = useQueries({
    queries: (history.data ?? []).map((booking) => ({
      queryKey: ["booking-details", booking.id],
      queryFn: () => api.getBookingDetails(booking.id),
    })),
  });
  const pending =
    history.isPending || detailQueries.some((query) => query.isPending);
  const error =
    history.error ?? detailQueries.find((query) => query.error)?.error;
  const data = detailQueries
    .map((query) => query.data)
    .filter((item): item is BookingDetails => Boolean(item))
    .sort((a, b) => b.trip.departureAt.localeCompare(a.trip.departureAt));
  const refresh = async () => {
    await history.refetch();
    await Promise.all(detailQueries.map((query) => query.refetch()));
  };
  if (pending)
    return (
      <State>
        <EtatContenu
          type="chargement"
          title="Chargement de l’historique"
          description="Nous récupérons vos anciennes courses."
        />
      </State>
    );
  if (error)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Historique indisponible"
          description={messageErreur(error)}
        />
      </State>
    );
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.booking.id}
        renderItem={({ item }) => <HistoryCard data={item} />}
        ItemSeparatorComponent={() => (
          <View style={{ height: espacements.md }} />
        )}
        ListHeaderComponent={
          <EntetePage
            title="Historique"
            description="Courses terminées, annulées ou expirées."
          />
        }
        ListHeaderComponentStyle={styles.header}
        ListEmptyComponent={
          <EtatContenu
            type="vide"
            title="Historique vide"
            description="Vos courses passées apparaîtront ici."
          />
        }
        contentContainerStyle={[styles.list, !data.length && styles.grow]}
        refreshControl={
          <RefreshControl
            refreshing={history.isRefetching}
            onRefresh={() => void refresh()}
            colors={[couleurs.primaire]}
          />
        }
      />
    </SafeAreaView>
  );
}
function State({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.state}>
        <EntetePage title="Historique" description="Vos courses passées." />
        {children}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  list: { padding: espacements.lg, paddingBottom: espacements.xxl },
  grow: { flexGrow: 1 },
  header: { marginBottom: espacements.lg },
  state: { flex: 1, padding: espacements.lg },
  pressed: { opacity: 0.65 },
  card: { gap: espacements.md },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  status: {
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surfaceSecondaire,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
  },
  price: { color: couleurs.texte, fontSize: 18, fontWeight: "900" },
  route: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  routeText: {
    flex: 1,
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "800",
  },
  meta: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  metaText: {
    flex: 1,
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
  },
  rateBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  rateText: {
    color: couleurs.attention,
    fontSize: taillesTexte.petit,
    fontWeight: "800",
  },
});
