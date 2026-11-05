import { IconCheck, IconClock, IconMapPin, IconX } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "@/api";
import { Bouton, Carte, Champ, EntetePage, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { parseCounterPrice, selectDriverRequests } from "@/features/driver-requests/driver-requests";
import { couleurs, espacements, polices, taillesTexte } from "@/theme";
import { vibrerSucces } from "@/features/animations";
import { capitaliser, formatDateTime } from "@/features/format";

type Action = "accept" | "counter" | "refuse";

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

export default function DriverRequestDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const queryClient = useQueryClient();
  const [counterPrice, setCounterPrice] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [completedAction, setCompletedAction] = useState<Action | null>(null);
  const tripsQuery = useQuery({ queryKey: ["driver-trips"], queryFn: () => api.listDriverTrips() });
  const bookingsQuery = useQuery({ queryKey: ["driver-bookings"], queryFn: () => api.listDriverBookings() });
  const request = selectDriverRequests(bookingsQuery.data ?? [], tripsQuery.data ?? [])
    .find((item) => item.booking.id === bookingId);

  const actionMutation = useMutation({
    mutationFn: async ({ action, price }: { action: Action; price?: number }) => {
      if (!bookingId) throw new ApiError("NOT_FOUND", "Demande introuvable.");
      if (action === "accept") return api.acceptBooking(bookingId);
      if (action === "refuse") return api.refuseBooking(bookingId);
      if (!price) throw new ApiError("INVALID_INPUT");
      return api.counterOfferBooking(bookingId, price);
    },
    onSuccess: async (_, variables) => {
      if (variables.action === "accept") vibrerSucces();
      setCompletedAction(variables.action);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["driver-bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["driver-trips"] }),
      ]);
    },
  });

  const counter = () => {
    const price = parseCounterPrice(counterPrice);
    if (!price) {
      setInputError("Entrez un prix en FCFA, sans virgule.");
      return;
    }
    setInputError(null);
    actionMutation.mutate({ action: "counter", price });
  };

  if (tripsQuery.isPending || bookingsQuery.isPending) {
    return <StatePage><MessageEtat>Chargement de la demande…</MessageEtat></StatePage>;
  }

  const queryError = tripsQuery.error ?? bookingsQuery.error;
  if (queryError) {
    return <StatePage><MessageEtat type="erreur">{messageErreur(queryError)}</MessageEtat></StatePage>;
  }

  if (completedAction) {
    const copy = completedAction === "accept"
      ? "C’est confirmé : le client monte avec vous, sa place est réservée."
      : completedAction === "counter"
        ? "Votre prix est parti. Le client doit maintenant dire oui."
        : "Demande refusée. Le client cherchera un autre taxi.";
    return (
      <StatePage>
        <MessageEtat type="succes">{copy}</MessageEtat>
        <Bouton onPress={() => router.replace("../demandes")}>Retour aux demandes</Bouton>
      </StatePage>
    );
  }

  if (!request) {
    return (
      <StatePage>
        <MessageEtat>Cette demande n’est plus valable, ou votre trajet est fermé.</MessageEtat>
        <Bouton onPress={() => router.replace("../demandes")}>Retour aux demandes</Bouton>
      </StatePage>
    );
  }

  const capacityError = actionMutation.error instanceof ApiError && actionMutation.error.code === "CAPACITY_EXCEEDED";

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <EntetePage title="Demande d’un client" description="Regardez où il monte, où il descend et le prix proposé." />
        <Carte style={styles.summary}>
          <Text style={styles.label}>PRIX PROPOSÉ</Text>
          <Text style={styles.price}>{formatPrice(request.booking.proposedPrice)}</Text>
          <View style={styles.row}>
            <IconMapPin color={couleurs.texteSecondaire} size={20} />
            <Text style={styles.rowText}>{request.pickupName} → {request.dropoffName}</Text>
          </View>
          <View style={styles.row}>
            <IconClock color={couleurs.texteSecondaire} size={20} />
            <Text style={styles.rowText}>{capitaliser(formatDateTime(request.trip.departureAt))}</Text>
          </View>
        </Carte>

        <View style={styles.actions}>
          <Bouton
            icone={<IconCheck color={couleurs.texte} size={20} />}
            chargement={actionMutation.isPending && actionMutation.variables?.action === "accept"}
            disabled={actionMutation.isPending}
            onPress={() => actionMutation.mutate({ action: "accept" })}
          >
            Prendre ce client
          </Bouton>

          <Carte style={styles.counterCard}>
            <Text style={styles.counterTitle}>Proposer un autre prix</Text>
            <Text style={styles.counterDescription}>Une seule fois. Le client devra l’accepter pour que la course soit confirmée.</Text>
            <Champ
              etiquette="Votre prix (FCFA)"
              value={counterPrice}
              onChangeText={setCounterPrice}
              placeholder="Ex. 1 800"
              keyboardType="number-pad"
              erreur={inputError ?? undefined}
            />
            <Bouton
              variante="secondaire"
              chargement={actionMutation.isPending && actionMutation.variables?.action === "counter"}
              disabled={actionMutation.isPending}
              onPress={counter}
            >
              Envoyer mon prix
            </Bouton>
          </Carte>

          <Bouton
            variante="fantome"
            icone={<IconX color={couleurs.erreur} size={20} />}
            chargement={actionMutation.isPending && actionMutation.variables?.action === "refuse"}
            disabled={actionMutation.isPending}
            onPress={() => actionMutation.mutate({ action: "refuse" })}
          >
            Refuser
          </Bouton>
        </View>

        {capacityError ? (
          <MessageEtat type="erreur">Votre taxi est plein sur cette portion. Vous ne pouvez plus prendre ce client.</MessageEtat>
        ) : actionMutation.isError ? (
          <MessageEtat type="erreur">{messageErreur(actionMutation.error)}</MessageEtat>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatePage({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.stateContent}>
        <EntetePage title="Demande d’un client" description="Prenez le client, proposez un autre prix ou refusez." />
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: { padding: espacements.lg, paddingBottom: espacements.xxl, gap: espacements.xl },
  stateContent: { flex: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.lg },
  summary: { padding: espacements.lg, gap: espacements.md },
  label: { color: couleurs.texteSecondaire, fontSize: 11, letterSpacing: 1.2, fontFamily: polices.texteGras },
  price: { color: couleurs.texte, fontSize: 36, fontFamily: polices.titre },
  row: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  rowText: { flex: 1, color: couleurs.texteSecondaire, fontSize: taillesTexte.normal, lineHeight: 22, fontFamily: polices.texte },
  actions: { gap: espacements.md },
  counterCard: { padding: espacements.lg, gap: espacements.md, backgroundColor: couleurs.surface },
  counterTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontFamily: polices.texteExtraGras },
  counterDescription: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 19, fontFamily: polices.texte },
});
