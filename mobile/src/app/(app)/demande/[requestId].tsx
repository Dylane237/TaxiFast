import {
  IconClock,
  IconEdit,
  IconMapPin,
  IconSearch,
  IconX,
} from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import {
  Bouton,
  Carte,
  EntetePage,
  EtatContenu,
  MessageEtat,
} from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatDateTime, formatPrice } from "@/features/format";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";

export default function WaitingRequestScreen() {
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: ["client-requests"],
    queryFn: () => api.listClientTripRequests(),
  });
  const corridors = useQuery({
    queryKey: ["corridors"],
    queryFn: () => api.listCorridors(),
  });
  const matches = useQuery({
    queryKey: ["request-matches", requestId],
    queryFn: () => api.listTripsForRequest(requestId!),
    enabled: Boolean(requestId),
  });
  const bookings = useQuery({
    queryKey: ["client-bookings"],
    queryFn: () => api.listClientBookings(),
  });
  const request = requests.data?.find((item) => item.id === requestId);
  const corridor = corridors.data?.find(
    (item) => item.id === request?.corridorId,
  );
  const offers = (bookings.data ?? []).filter(
    (booking) =>
      booking.requestId === requestId &&
      booking.status === "PROPOSED_BY_DRIVER",
  );
  const cancel = useMutation({
    mutationFn: () => api.cancelTripRequest(requestId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-requests"] });
    },
  });
  const pending =
    requests.isPending ||
    corridors.isPending ||
    matches.isPending ||
    bookings.isPending;
  const error =
    requests.error ?? corridors.error ?? matches.error ?? bookings.error;
  if (pending)
    return (
      <State>
        <EtatContenu
          type="chargement"
          title="On cherche votre taxi"
          description="On regarde quels chauffeurs passent par votre chemin."
        />
      </State>
    );
  if (error)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Recherche impossible pour l’instant"
          description={messageErreur(error)}
        />
      </State>
    );
  if (!request)
    return (
      <State>
        <EtatContenu
          type="vide"
          title="Cette demande n’existe plus"
          description="Elle a peut-être été annulée entre-temps."
        />
      </State>
    );
  const from =
    corridor?.stops.find((stop) => stop.id === request.fromStopId)?.name ??
    "Départ";
  const to =
    corridor?.stops.find((stop) => stop.id === request.toStopId)?.name ??
    "Arrivée";
  const inactive = request.status !== "OPEN" || cancel.isSuccess;
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <EntetePage
          title="En attente"
          description="Les chauffeurs qui passent par votre chemin voient votre demande."
        />
        <View style={styles.pulse}>
          <View style={styles.pulseInner}>
            <IconSearch color={couleurs.texte} size={25} />
          </View>
        </View>
        <Text style={styles.centerTitle}>
          {inactive ? "Recherche arrêtée" : "Recherche en cours"}
        </Text>
        <Text style={styles.centerCopy}>
          {inactive
            ? "Plus aucun chauffeur ne pourra vous faire d’offre sur cette demande."
            : "Vous pouvez quitter cet écran, les offres vous attendront à l’accueil."}
        </Text>
        <Carte style={styles.summary}>
          <View style={styles.row}>
            <IconMapPin color={couleurs.texteSecondaire} size={19} />
            <Text style={styles.route}>
              {from} → {to}
            </Text>
          </View>
          <View style={styles.row}>
            <IconClock color={couleurs.texteSecondaire} size={19} />
            <Text style={styles.meta}>
              {formatDateTime(request.windowStart)} –{" "}
              {formatDateTime(request.windowEnd)}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.meta}>Le prix que vous proposez</Text>
            <Text style={styles.price}>
              {formatPrice(request.proposedPrice)}
            </Text>
          </View>
        </Carte>
        {!inactive ? (
          <Bouton
            variante="secondaire"
            icone={<IconEdit color={couleurs.texte} size={19} />}
            onPress={() => router.push({ pathname: "/modifier-demande/[requestId]", params: { requestId: request.id } } as never)}
          >
            Modifier la demande
          </Bouton>
        ) : null}
        {!inactive ? (
          <Bouton
            onPress={() =>
              router.push({
                pathname: "/offres/[requestId]",
                params: { requestId: request.id },
              })
            }
          >
            {offers.length
              ? `Voir ${offers.length} offre${offers.length > 1 ? "s" : ""}`
              : `Voir ${matches.data?.length ?? 0} taxi${(matches.data?.length ?? 0) > 1 ? "s" : ""} sur votre chemin`}
          </Bouton>
        ) : null}
        {cancel.isError ? (
          <MessageEtat type="erreur">{messageErreur(cancel.error)}</MessageEtat>
        ) : null}
        {!inactive ? (
          <Bouton
            variante="fantome"
            icone={<IconX color={couleurs.erreur} size={19} />}
            chargement={cancel.isPending}
            onPress={() => cancel.mutate()}
          >
            Annuler la demande
          </Bouton>
        ) : (
          <Bouton
            variante="secondaire"
            onPress={() => router.replace("/mes-demandes")}
          >
            Retour aux demandes
          </Bouton>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function State({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.state}>
        <EntetePage
          title="En attente"
          description="Suivi de votre demande."
        />
        {children}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: {
    padding: espacements.lg,
    paddingBottom: espacements.xxl,
    gap: espacements.md,
  },
  state: { flex: 1, padding: espacements.lg },
  pulse: {
    alignSelf: "center",
    width: 74,
    height: 74,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.primaireClaire,
    alignItems: "center",
    justifyContent: "center",
    marginTop: espacements.sm,
  },
  pulseInner: {
    width: 50,
    height: 50,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.primaire,
    alignItems: "center",
    justifyContent: "center",
  },
  centerTitle: {
    color: couleurs.texte,
    fontSize: 22,
    textAlign: "center",
    fontFamily: polices.titre,
  },
  centerCopy: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: espacements.lg,
    fontFamily: polices.texte,
  },
  summary: { gap: espacements.md, marginVertical: espacements.sm },
  row: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  route: {
    flex: 1,
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontFamily: polices.texteExtraGras,
  },
  meta: {
    flex: 1,
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    fontFamily: polices.texte,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    paddingTop: espacements.md,
  },
  price: { color: couleurs.texte, fontSize: 18, fontFamily: polices.titre },
});
