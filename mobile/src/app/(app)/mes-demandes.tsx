import {
  IconArrowRight,
  IconClock,
  IconMapPin,
  IconSearch,
} from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
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
import { api, type TripRequest } from "@/api";
import { Carte, EntetePage, EtatContenu } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatDateTime, formatPrice } from "@/features/format";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

const labels = {
  OPEN: "En recherche",
  MATCHED: "Associée",
  EXPIRED: "Expirée",
  CANCELLED: "Annulée",
} as const;

function RequestCard({
  request,
  stops,
}: {
  request: TripRequest;
  stops: Map<string, string>;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/demande/[requestId]",
          params: { requestId: request.id },
        })
      }
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Carte style={styles.card}>
        <View style={styles.top}>
          <View style={styles.status}>
            <Text style={styles.statusText}>{labels[request.status]}</Text>
          </View>
          <Text style={styles.price}>{formatPrice(request.proposedPrice)}</Text>
        </View>
        <View style={styles.route}>
          <IconMapPin color={couleurs.texteSecondaire} size={18} />
          <Text style={styles.routeText}>
            {stops.get(request.fromStopId) ?? "Départ"} →{" "}
            {stops.get(request.toStopId) ?? "Arrivée"}
          </Text>
        </View>
        <View style={styles.meta}>
          <IconClock color={couleurs.texteSecondaire} size={17} />
          <Text style={styles.metaText}>
            {formatDateTime(request.windowStart)} –{" "}
            {formatDateTime(request.windowEnd)}
          </Text>
          <IconArrowRight color={couleurs.texteSecondaire} size={19} />
        </View>
      </Carte>
    </Pressable>
  );
}

export default function ClientRequestsScreen() {
  const requests = useQuery({
    queryKey: ["client-requests"],
    queryFn: () => api.listClientTripRequests(),
  });
  const corridors = useQuery({
    queryKey: ["corridors"],
    queryFn: () => api.listCorridors(),
  });
  const pending = requests.isPending || corridors.isPending;
  const error = requests.error ?? corridors.error;
  const stopNames = new Map(
    (corridors.data ?? []).flatMap((corridor) =>
      corridor.stops.map((stop) => [stop.id, stop.name] as const),
    ),
  );
  const data = [...(requests.data ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const refresh = async () => {
    await Promise.all([requests.refetch(), corridors.refetch()]);
  };
  if (pending)
    return (
      <State>
        <EtatContenu
          type="chargement"
          title="Chargement des demandes"
          description="Nous récupérons vos recherches en cours."
        />
      </State>
    );
  if (error)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Demandes indisponibles"
          description={messageErreur(error)}
        />
      </State>
    );
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard request={item} stops={stopNames} />
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: espacements.md }} />
        )}
        ListHeaderComponent={
          <EntetePage
            title="Mes demandes"
            description="Suivez vos recherches et les réponses des chauffeurs."
          />
        }
        ListHeaderComponentStyle={styles.header}
        ListEmptyComponent={
          <EtatContenu
            type="vide"
            title="Aucune demande"
            description="Lancez une recherche pour recevoir des trajets compatibles."
            action={
              <Pressable
                style={styles.emptyAction}
                onPress={() => router.push("/recherche")}
              >
                <IconSearch color={couleurs.texte} size={18} />
                <Text style={styles.emptyActionText}>Rechercher un trajet</Text>
              </Pressable>
            }
          />
        }
        contentContainerStyle={[styles.list, !data.length && styles.grow]}
        refreshControl={
          <RefreshControl
            refreshing={requests.isRefetching || corridors.isRefetching}
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
          title="Mes demandes"
          description="Recherches envoyées aux chauffeurs."
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
  card: { gap: espacements.md },
  pressed: { opacity: 0.65 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  status: {
    backgroundColor: couleurs.primaireClaire,
    borderRadius: rayons.rond,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    color: couleurs.texte,
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
  emptyAction: {
    minHeight: 48,
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espacements.sm,
  },
  emptyActionText: { color: couleurs.texte, fontWeight: "800" },
});
