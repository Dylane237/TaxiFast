import {
  IconCalendar,
  IconCar,
  IconCircleCheck,
  IconMapPin,
  IconRadar,
  IconX,
} from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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
import { parseRouteId } from "@/features/route-params";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export default function ConfirmedBookingScreen() {
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingId = parseRouteId(params.bookingId);
  const queryClient = useQueryClient();
  const details = useQuery({
    queryKey: ["booking-details", bookingId],
    queryFn: () => api.getBookingDetails(bookingId!),
    enabled: Boolean(bookingId),
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelBooking(bookingId!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["client-bookings"] }),
        queryClient.invalidateQueries({
          queryKey: ["booking-details", bookingId],
        }),
      ]);
    },
  });
  if (!bookingId)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Réservation invalide"
          description="Impossible d’identifier cette réservation."
        />
      </State>
    );
  if (details.isPending)
    return (
      <State>
        <EtatContenu
          type="chargement"
          title="Chargement de la réservation"
          description="Nous récupérons les informations du trajet."
        />
      </State>
    );
  if (details.isError)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Réservation indisponible"
          description={messageErreur(details.error)}
        />
      </State>
    );
  const data = details.data;
  if (cancel.isSuccess || data.booking.status === "CANCELLED")
    return (
      <State>
        <EtatContenu
          type="vide"
          title="Réservation annulée"
          description="La place a été libérée sur les tronçons concernés."
          action={
            <Bouton onPress={() => router.replace("/accueil")}>
              Retour à l’accueil
            </Bouton>
          }
        />
      </State>
    );
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <EntetePage
          title="Réservation confirmée"
          description="Les informations utiles pour rejoindre votre chauffeur."
        />
        <View style={styles.successIcon}>
          <IconCircleCheck color={couleurs.succes} size={32} />
        </View>
        <Text style={styles.title}>Votre place est réservée</Text>
        <Carte style={styles.card}>
          <View style={styles.row}>
            <IconMapPin color={couleurs.texteSecondaire} size={20} />
            <View style={styles.copy}>
              <Text style={styles.label}>TRAJET</Text>
              <Text style={styles.value}>
                {data.pickupStop.name} → {data.dropoffStop.name}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <IconCalendar color={couleurs.texteSecondaire} size={20} />
            <View style={styles.copy}>
              <Text style={styles.label}>DÉPART</Text>
              <Text style={styles.value}>
                {formatDateTime(data.trip.departureAt)}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <IconCar color={couleurs.texteSecondaire} size={20} />
            <View style={styles.copy}>
              <Text style={styles.label}>CHAUFFEUR</Text>
              <Text style={styles.value}>
                {data.driver.name ?? "Chauffeur"} ·{" "}
                {data.driver.vehicle?.model ?? "Véhicule"}
              </Text>
              <Text style={styles.meta}>
                {data.driver.vehicle?.plate ?? "Plaque à confirmer"}
              </Text>
            </View>
          </View>
          <View style={styles.total}>
            <Text style={styles.meta}>Prix convenu</Text>
            <Text style={styles.price}>
              {formatPrice(
                data.booking.agreedPrice ??
                  data.booking.counterPrice ??
                  data.booking.proposedPrice,
              )}
            </Text>
          </View>
        </Carte>
        <Bouton
          variante="secondaire"
          icone={<IconRadar color={couleurs.texte} size={19} />}
          onPress={() => router.push({ pathname: "/suivi/[tripId]", params: { tripId: data.trip.id } } as never)}
        >
          Suivre le chauffeur
        </Bouton>
        {cancel.isError ? (
          <MessageEtat type="erreur">{messageErreur(cancel.error)}</MessageEtat>
        ) : null}
        <Bouton
          variante="fantome"
          icone={<IconX color={couleurs.erreur} size={19} />}
          chargement={cancel.isPending}
          onPress={() =>
            Alert.alert(
              "Annuler la réservation ?",
              "Votre place sera immédiatement libérée.",
              [
                { text: "Garder", style: "cancel" },
                {
                  text: "Annuler",
                  style: "destructive",
                  onPress: () => cancel.mutate(),
                },
              ],
            )
          }
        >
          Annuler la réservation
        </Bouton>
      </ScrollView>
    </SafeAreaView>
  );
}
function State({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.state}>
        <EntetePage title="Réservation" description="État de votre course." />
        {children}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: { padding: espacements.lg, gap: espacements.md },
  state: { flex: 1, padding: espacements.lg },
  successIcon: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.succesClaire,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: couleurs.texte,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  card: { gap: espacements.md },
  row: { flexDirection: "row", gap: espacements.md, alignItems: "flex-start" },
  copy: { flex: 1, gap: 2 },
  label: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
    letterSpacing: 1,
  },
  value: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "800",
  },
  meta: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit },
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    paddingTop: espacements.md,
  },
  price: { color: couleurs.texte, fontSize: 20, fontWeight: "900" },
});
