import {
  IconCar,
  IconClock,
  IconMapPin,
  IconStar,
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
import { formatDateTime, formatNote, formatPrice } from "@/features/format";
import { parseRouteId } from "@/features/route-params";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";
import { vibrerSucces } from "@/features/animations";

export default function CompatibleTripScreen() {
  const params = useLocalSearchParams<{
    requestId?: string | string[];
    tripId?: string | string[];
  }>();
  const requestId = parseRouteId(params.requestId);
  const tripId = parseRouteId(params.tripId);
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: ["client-requests"],
    queryFn: () => api.listClientTripRequests(),
  });
  const matches = useQuery({
    queryKey: ["request-matches", requestId],
    queryFn: () => api.listTripsForRequest(requestId!),
    enabled: Boolean(requestId),
  });
  const request = requests.data?.find((item) => item.id === requestId);
  const trip = matches.data?.find((item) => item.id === tripId);
  const propose = useMutation({
    mutationFn: () =>
      api.proposeBooking({
        tripId: tripId!,
        pickupStopId: request!.fromStopId,
        dropoffStopId: request!.toStopId,
        proposedPrice: request!.proposedPrice,
        requestId: requestId!,
      }),
    onSuccess: async () => {
      vibrerSucces();
      await queryClient.invalidateQueries({ queryKey: ["client-bookings"] });
    },
  });
  if (!requestId || !tripId)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Lien incomplet"
          description="Rouvrez le trajet depuis votre demande."
        />
      </State>
    );
  if (requests.isPending || matches.isPending)
    return (
      <State>
        <EtatContenu
          type="chargement"
          title="Chargement du trajet"
          description="On vérifie qu’il reste de la place."
        />
      </State>
    );
  const error = requests.error ?? matches.error;
  if (error)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Impossible d’ouvrir ce trajet"
          description={messageErreur(error)}
        />
      </State>
    );
  if (!request || !trip)
    return (
      <State>
        <EtatContenu
          type="vide"
          title="Ce taxi n’est plus disponible"
          description="Il s’est peut-être rempli entre-temps."
        />
      </State>
    );
  if (propose.isSuccess)
    return (
      <State>
        <EtatContenu
          type="succes"
          title="Demande envoyée au chauffeur"
          description="Dès qu’il accepte, votre place est réservée."
          action={
            <Bouton
              onPress={() =>
                router.replace({
                  pathname: "/demande/[requestId]",
                  params: { requestId },
                })
              }
            >
              Suivre ma demande
            </Bouton>
          }
        />
      </State>
    );
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <EntetePage
          title="Un taxi sur votre chemin"
          description="Regardez le chauffeur et l’heure, puis envoyez votre prix."
        />
        <Carte style={styles.driver}>
          <View style={styles.avatar}>
            <IconCar color={couleurs.texte} size={24} />
          </View>
          <View style={styles.driverCopy}>
            <Text style={styles.driverName}>
              {trip.driver.name ?? "Chauffeur"}
            </Text>
            <Text style={styles.meta}>
              {trip.driver.vehicle?.model ?? "Véhicule"} ·{" "}
              {trip.driver.vehicle?.plate ?? "Plaque à confirmer"}
            </Text>
          </View>
          <View style={styles.rating}>
            <IconStar
              color={couleurs.attention}
              fill={couleurs.primaire}
              size={17}
            />
            <Text style={styles.ratingText}>
              {(trip.driver.rating != null ? formatNote(trip.driver.rating) : "Nouveau")}
            </Text>
          </View>
        </Carte>
        <Carte style={styles.details}>
          <View style={styles.row}>
            <IconClock color={couleurs.texteSecondaire} size={19} />
            <Text style={styles.rowText}>
              Départ {formatDateTime(trip.departureAt)}
            </Text>
          </View>
          <View style={styles.row}>
            <IconMapPin color={couleurs.texteSecondaire} size={19} />
            <Text style={styles.rowText}>
              {
                trip.tripStops.find(
                  (item) => item.stopId === request.fromStopId,
                )?.stop.name
              }{" "}
              →{" "}
              {
                trip.tripStops.find((item) => item.stopId === request.toStopId)
                  ?.stop.name
              }
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.meta}>Votre prix</Text>
            <Text style={styles.price}>
              {formatPrice(request.proposedPrice)}
            </Text>
          </View>
        </Carte>
        {propose.isError ? (
          <MessageEtat type="erreur">
            {messageErreur(propose.error)}
          </MessageEtat>
        ) : null}
        <Bouton chargement={propose.isPending} onPress={() => propose.mutate()}>
          Envoyer au chauffeur
        </Bouton>
      </ScrollView>
    </SafeAreaView>
  );
}
function State({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.state}>
        <EntetePage
          title="Un taxi sur votre chemin"
          description="Le chauffeur et son véhicule."
        />
        {children}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: { padding: espacements.lg, gap: espacements.md },
  state: { flex: 1, padding: espacements.lg },
  driver: { flexDirection: "row", alignItems: "center", gap: espacements.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: rayons.md,
    backgroundColor: couleurs.primaire,
    alignItems: "center",
    justifyContent: "center",
  },
  driverCopy: { flex: 1, gap: 2 },
  driverName: { color: couleurs.texte, fontSize: 18, fontFamily: polices.texteExtraGras },
  meta: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, fontFamily: polices.texte },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { color: couleurs.texte, fontFamily: polices.texteExtraGras },
  details: { gap: espacements.md },
  row: { flexDirection: "row", gap: espacements.sm, alignItems: "center" },
  rowText: {
    flex: 1,
    color: couleurs.texte,
    fontSize: taillesTexte.petit,
    fontFamily: polices.texteDemiGras,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    paddingTop: espacements.md,
  },
  price: { color: couleurs.texte, fontSize: 20, fontFamily: polices.titre },
});
