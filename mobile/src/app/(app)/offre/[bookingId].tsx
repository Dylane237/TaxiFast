import {
  IconCheck,
  IconClock,
  IconMapPin,
  IconStar,
  IconX,
} from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import {
  Bouton,
  Carte,
  Champ,
  EntetePage,
  EtatContenu,
  MessageEtat,
} from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatDateTime, formatPrice } from "@/features/format";
import { parseCounterPrice } from "@/features/driver-requests/driver-requests";
import { parseRouteId } from "@/features/route-params";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";
import { vibrerSucces } from "@/features/animations";

type Action = "accept" | "counter" | "refuse";

export default function OfferDetailScreen() {
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingId = parseRouteId(params.bookingId);
  const queryClient = useQueryClient();
  const [counterPrice, setCounterPrice] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const details = useQuery({
    queryKey: ["booking-details", bookingId],
    queryFn: () => api.getBookingDetails(bookingId!),
    enabled: Boolean(bookingId),
  });
  const action = useMutation({
    mutationFn: ({ kind, price }: { kind: Action; price?: number }) =>
      kind === "accept"
        ? api.acceptBooking(bookingId!)
        : kind === "refuse"
          ? api.refuseBooking(bookingId!)
          : api.counterOfferBooking(bookingId!, price!),
    onSuccess: async (booking, variables) => {
      if (variables.kind === "accept") vibrerSucces();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["client-bookings"] }),
        queryClient.invalidateQueries({
          queryKey: ["booking-details", bookingId],
        }),
      ]);
      if (variables.kind === "accept")
        router.replace({
          pathname: "/reservation/[bookingId]",
          params: { bookingId: booking.id },
        });
    },
  });
  if (!bookingId)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Lien d’offre incorrect"
          description="Rouvrez l’offre depuis votre demande."
        />
      </State>
    );
  if (details.isPending)
    return (
      <State>
        <EtatContenu
          type="chargement"
          title="Chargement de l’offre"
          description="On vérifie qu’elle tient toujours."
        />
      </State>
    );
  if (details.isError)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Impossible d’ouvrir l’offre"
          description={messageErreur(details.error)}
        />
      </State>
    );
  const data = details.data;
  const expired = Boolean(
    data.booking.expiresAt &&
      data.booking.expiresAt <= new Date().toISOString(),
  );
  const actionable = data.booking.status === "PROPOSED_BY_DRIVER" && !expired;
  if (!actionable && data.booking.status === "CONFIRMED")
    return (
      <State>
        <EtatContenu
          type="vide"
          title="Déjà réservé"
          description="Vous avez déjà accepté cette offre."
          action={
            <Bouton
              onPress={() =>
                router.replace({
                  pathname: "/reservation/[bookingId]",
                  params: { bookingId: data.booking.id },
                })
              }
            >
              Voir la réservation
            </Bouton>
          }
        />
      </State>
    );
  if (!actionable)
    return (
      <State>
        <EtatContenu
          type="vide"
          title={expired ? "Offre expirée" : "Offre déjà réglée"}
          description={
            expired
              ? "Le temps pour répondre est passé. Regardez les autres taxis sur votre chemin."
              : "On ne peut plus y répondre."
          }
        />
      </State>
    );
  const submitCounter = () => {
    const price = parseCounterPrice(counterPrice);
    if (!price) {
      setValidationError("Le prix doit être un nombre entier de FCFA.");
      return;
    }
    setValidationError(null);
    action.mutate({ kind: "counter", price });
  };
  if (action.isSuccess && action.variables.kind !== "accept")
    return (
      <State>
        <EtatContenu
          type="vide"
          title={
            action.variables.kind === "counter"
              ? "Nouveau prix envoyé"
              : "Offre refusée"
          }
          description={
            action.variables.kind === "counter"
              ? "Le chauffeur doit maintenant accepter votre prix. Vous ne pourrez pas en proposer un autre."
              : "Elle n’apparaît plus dans vos offres."
          }
          action={
            <Bouton
              onPress={() =>
                router.replace({
                  pathname: "/offres/[requestId]",
                  params: { requestId: data.booking.requestId ?? "" },
                })
              }
            >
              Retour aux offres
            </Bouton>
          }
        />
      </State>
    );
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <EntetePage
          title="Offre d’un chauffeur"
          description="Acceptez, proposez votre prix ou refusez."
        />
        <Carte style={styles.hero}>
          <View style={styles.driverTop}>
            <View>
              <Text style={styles.kicker}>CHAUFFEUR</Text>
              <Text style={styles.driverName}>
                {data.driver.name ?? "Chauffeur"}
              </Text>
            </View>
            <View style={styles.rating}>
              <IconStar
                color={couleurs.attention}
                fill={couleurs.primaire}
                size={17}
              />
              <Text style={styles.ratingText}>
                {data.driver.rating?.toFixed(1) ?? "Nouveau"}
              </Text>
            </View>
          </View>
          <Text style={styles.vehicle}>
            {data.driver.vehicle?.model ?? "Véhicule"} ·{" "}
            {data.driver.vehicle?.plate ?? "Plaque à confirmer"}
          </Text>
          <Text style={styles.price}>
            {formatPrice(
              data.booking.counterPrice ?? data.booking.proposedPrice,
            )}
          </Text>
        </Carte>
        <Carte style={styles.details}>
          <View style={styles.row}>
            <IconMapPin color={couleurs.texteSecondaire} size={19} />
            <Text style={styles.rowText}>
              {data.pickupStop.name} → {data.dropoffStop.name}
            </Text>
          </View>
          <View style={styles.row}>
            <IconClock color={couleurs.texteSecondaire} size={19} />
            <Text style={styles.rowText}>
              {formatDateTime(data.trip.departureAt)}
            </Text>
          </View>
        </Carte>
        {action.isError ? (
          <MessageEtat type="erreur">{messageErreur(action.error)}</MessageEtat>
        ) : null}
        <Bouton
          icone={<IconCheck color={couleurs.texte} size={19} />}
          chargement={action.isPending && action.variables?.kind === "accept"}
          disabled={action.isPending}
          onPress={() => action.mutate({ kind: "accept" })}
        >
          Accepter l’offre
        </Bouton>
        {data.booking.counterPrice === null ? (
          <Carte style={styles.counter}>
            <Text style={styles.counterTitle}>Proposer mon prix</Text>
            <Champ
              etiquette="Votre prix (FCFA)"
              value={counterPrice}
              onChangeText={setCounterPrice}
              keyboardType="number-pad"
              placeholder="1 600"
              erreur={validationError ?? undefined}
            />
            <Bouton
              variante="secondaire"
              chargement={
                action.isPending && action.variables?.kind === "counter"
              }
              disabled={action.isPending}
              onPress={submitCounter}
            >
              Envoyer ce prix
            </Bouton>
          </Carte>
        ) : (
          <MessageEtat>Vous avez déjà proposé votre prix une fois.</MessageEtat>
        )}
        <Bouton
          variante="fantome"
          icone={<IconX color={couleurs.erreur} size={19} />}
          disabled={action.isPending}
          onPress={() => action.mutate({ kind: "refuse" })}
        >
          Refuser l’offre
        </Bouton>
      </ScrollView>
    </SafeAreaView>
  );
}
function State({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.state}>
        <EntetePage title="Offre" description="Ce que le chauffeur vous propose." />
        {children}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: {
    padding: espacements.lg,
    gap: espacements.md,
    paddingBottom: espacements.xxl,
  },
  state: { flex: 1, padding: espacements.lg },
  hero: { gap: espacements.sm },
  driverTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    letterSpacing: 1,
    fontFamily: polices.texteGras,
  },
  driverName: { color: couleurs.texte, fontSize: 20, fontFamily: polices.titre },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: couleurs.primaireClaire,
    borderRadius: rayons.rond,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ratingText: { color: couleurs.texte, fontFamily: polices.texteExtraGras },
  vehicle: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, fontFamily: polices.texte },
  price: {
    color: couleurs.texte,
    fontSize: 28,
    marginTop: espacements.sm,
    fontFamily: polices.titre,
  },
  details: { gap: espacements.md },
  row: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  rowText: {
    flex: 1,
    color: couleurs.texte,
    fontSize: taillesTexte.petit,
    fontFamily: polices.texteDemiGras,
  },
  counter: { gap: espacements.md },
  counterTitle: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontFamily: polices.texteExtraGras,
  },
});
