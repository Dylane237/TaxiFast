import {
  IconCar,
  IconChevronRight,
  IconClock,
  IconStar,
} from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Booking, type MatchedTrip } from "@/api";
import { Carte, EntetePage, EtatContenu } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatPrice, formatTime } from "@/features/format";
import { parseRouteId } from "@/features/route-params";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

type OfferItem =
  | { kind: "offer"; id: string; booking: Booking }
  | { kind: "trip"; id: string; trip: MatchedTrip };

function OfferCard({
  item,
  requestId,
}: {
  item: OfferItem;
  requestId: string;
}) {
  if (item.kind === "offer") {
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/offre/[bookingId]",
            params: { bookingId: item.booking.id },
          })
        }
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Carte style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>OFFRE REÇUE</Text>
            </View>
            <Text style={styles.price}>
              {formatPrice(
                item.booking.counterPrice ?? item.booking.proposedPrice,
              )}
            </Text>
          </View>
          <Text style={styles.cardTitle}>
            Un chauffeur vous propose ce trajet
          </Text>
          <View style={styles.meta}>
            <IconClock color={couleurs.texteSecondaire} size={17} />
            <Text style={styles.metaText}>Expire bientôt</Text>
            <IconChevronRight color={couleurs.texteSecondaire} size={19} />
          </View>
        </Carte>
      </Pressable>
    );
  }
  const model = item.trip.driver.vehicle?.model ?? "Véhicule renseigné";
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/trajet-compatible/[requestId]/[tripId]",
          params: { requestId, tripId: item.trip.id },
        })
      }
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Carte style={styles.card}>
        <View style={styles.driverRow}>
          <View style={styles.avatar}>
            <IconCar color={couleurs.texte} size={21} />
          </View>
          <View style={styles.driverCopy}>
            <Text style={styles.cardTitle}>
              {item.trip.driver.name ?? "Chauffeur"}
            </Text>
            <Text style={styles.metaText}>
              {model} ·{" "}
              {item.trip.driver.vehicle?.plate ?? "Plaque à confirmer"}
            </Text>
          </View>
          <View style={styles.rating}>
            <IconStar
              color={couleurs.attention}
              fill={couleurs.primaire}
              size={16}
            />
            <Text style={styles.ratingText}>
              {item.trip.driver.rating?.toFixed(1) ?? "—"}
            </Text>
          </View>
        </View>
        <View style={styles.meta}>
          <IconClock color={couleurs.texteSecondaire} size={17} />
          <Text style={styles.metaText}>
            Départ à {formatTime(item.trip.departureAt)}
          </Text>
          <IconChevronRight color={couleurs.texteSecondaire} size={19} />
        </View>
      </Carte>
    </Pressable>
  );
}

export default function OffersScreen() {
  const params = useLocalSearchParams<{ requestId?: string | string[] }>();
  const requestId = parseRouteId(params.requestId);
  const matches = useQuery({
    queryKey: ["request-matches", requestId],
    queryFn: () => api.listTripsForRequest(requestId!),
    enabled: Boolean(requestId),
  });
  const bookings = useQuery({
    queryKey: ["client-bookings"],
    queryFn: () => api.listClientBookings(),
    enabled: Boolean(requestId),
  });
  const pending = matches.isPending || bookings.isPending;
  const error = matches.error ?? bookings.error;
  const items: OfferItem[] = [
    ...(bookings.data ?? [])
      .filter(
        (booking) =>
          booking.requestId === requestId &&
          booking.status === "PROPOSED_BY_DRIVER",
      )
      .map((booking) => ({
        kind: "offer" as const,
        id: `offer-${booking.id}`,
        booking,
      })),
    ...(matches.data ?? []).map((trip) => ({
      kind: "trip" as const,
      id: `trip-${trip.id}`,
      trip,
    })),
  ];
  const refresh = async () => {
    await Promise.all([matches.refetch(), bookings.refetch()]);
  };
  if (!requestId)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Demande invalide"
          description="Impossible d’identifier cette recherche."
        />
      </State>
    );
  if (pending)
    return (
      <State>
        <EtatContenu
          type="chargement"
          title="Comparaison des trajets"
          description="Nous classons les offres et les chauffeurs compatibles."
        />
      </State>
    );
  if (error)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Offres indisponibles"
          description={messageErreur(error)}
        />
      </State>
    );
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OfferCard item={item} requestId={requestId} />
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: espacements.md }} />
        )}
        ListHeaderComponent={
          <EntetePage
            title="Offres et trajets"
            description="Comparez l’heure, le véhicule et la note avant de choisir."
          />
        }
        ListHeaderComponentStyle={styles.header}
        ListEmptyComponent={
          <EtatContenu
            type="vide"
            title="Aucune offre pour le moment"
            description="Votre demande reste active. Revenez dans quelques minutes."
          />
        }
        contentContainerStyle={[styles.list, !items.length && styles.grow]}
        refreshControl={
          <RefreshControl
            refreshing={matches.isRefetching || bookings.isRefetching}
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
        <EntetePage
          title="Offres"
          description="Chauffeurs et trajets compatibles."
        />
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
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  offerBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.primaireClaire,
  },
  offerBadgeText: {
    color: couleurs.texte,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
  },
  price: { color: couleurs.texte, fontSize: 19, fontWeight: "900" },
  cardTitle: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "900",
  },
  meta: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  metaText: {
    flex: 1,
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: rayons.md,
    backgroundColor: couleurs.primaire,
    alignItems: "center",
    justifyContent: "center",
  },
  driverCopy: { flex: 1, gap: 2 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: {
    color: couleurs.texte,
    fontSize: taillesTexte.petit,
    fontWeight: "900",
  },
});
