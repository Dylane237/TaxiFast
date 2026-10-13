import { IconMapPin, IconStar, IconUser } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { parseRouteId } from "@/features/route-params";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export default function HistoryDetailScreen() {
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingId = parseRouteId(params.bookingId);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const details = useQuery({
    queryKey: ["booking-details", bookingId],
    queryFn: () => api.getBookingDetails(bookingId!),
    enabled: Boolean(bookingId),
  });
  const rating = useMutation({
    mutationFn: () =>
      api.createRating({
        bookingId: bookingId!,
        targetId:
          user?.role === "DRIVER"
            ? details.data!.client.id
            : details.data!.driver.id,
        score,
        comment: comment.trim() || undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["booking-details", bookingId],
        }),
        queryClient.invalidateQueries({ queryKey: ["booking-history"] }),
      ]);
    },
  });
  if (!bookingId)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Course invalide"
          description="Impossible d’identifier cette course."
        />
      </State>
    );
  if (details.isPending)
    return (
      <State>
        <EtatContenu
          type="chargement"
          title="Chargement de la course"
          description="Nous préparons son récapitulatif."
        />
      </State>
    );
  if (details.isError)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Course indisponible"
          description={messageErreur(details.error)}
        />
      </State>
    );
  const data = details.data;
  const targetName =
    user?.role === "DRIVER" ? data.client.name : data.driver.name;
  const submit = () => {
    if (score < 1) {
      setValidationError("Choisissez une note entre 1 et 5 étoiles.");
      return;
    }
    setValidationError(null);
    rating.mutate();
  };
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <EntetePage
          title="Détail de la course"
          description={formatDateTime(data.trip.departureAt)}
        />
        <Carte style={styles.summary}>
          <View style={styles.row}>
            <IconMapPin color={couleurs.texteSecondaire} size={19} />
            <Text style={styles.route}>
              {data.pickupStop.name} → {data.dropoffStop.name}
            </Text>
          </View>
          <View style={styles.row}>
            <IconUser color={couleurs.texteSecondaire} size={19} />
            <Text style={styles.meta}>
              {user?.role === "DRIVER"
                ? (data.client.name ?? "Client")
                : (data.driver.name ?? "Chauffeur")}
            </Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.meta}>Prix convenu</Text>
            <Text style={styles.price}>
              {formatPrice(
                data.booking.agreedPrice ?? data.booking.proposedPrice,
              )}
            </Text>
          </View>
        </Carte>
        {data.booking.status === "COMPLETED" &&
        !data.ratedByCurrentUser &&
        !rating.isSuccess ? (
          <Carte style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>
              Comment s’est passée la course avec{" "}
              {targetName ?? "cette personne"} ?
            </Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  accessibilityLabel={`${value} étoile${value > 1 ? "s" : ""}`}
                  onPress={() => setScore(value)}
                  style={styles.starButton}
                >
                  <IconStar
                    color={
                      value <= score ? couleurs.attention : couleurs.desactive
                    }
                    fill={value <= score ? couleurs.primaire : "transparent"}
                    size={31}
                  />
                </Pressable>
              ))}
            </View>
            <Champ
              etiquette="Commentaire (facultatif)"
              value={comment}
              onChangeText={setComment}
              placeholder="Ponctualité, conduite, courtoisie…"
              multiline
              maxLength={500}
            />
            {validationError ? (
              <MessageEtat type="erreur">{validationError}</MessageEtat>
            ) : null}
            {rating.isError ? (
              <MessageEtat type="erreur">
                {messageErreur(rating.error)}
              </MessageEtat>
            ) : null}
            <Bouton chargement={rating.isPending} onPress={submit}>
              Publier mon avis
            </Bouton>
          </Carte>
        ) : (
          <MessageEtat type="succes">
            {rating.isSuccess
              ? "Merci, votre avis a été enregistré."
              : data.ratedByCurrentUser
                ? "Vous avez déjà noté cette course."
                : "Cette course ne peut pas être notée."}
          </MessageEtat>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function State({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.state}>
        <EntetePage title="Course" description="Récapitulatif et notation." />
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
  summary: { gap: espacements.md },
  row: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  route: {
    flex: 1,
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "900",
  },
  meta: {
    flex: 1,
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
  },
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    paddingTop: espacements.md,
  },
  price: { color: couleurs.texte, fontSize: 20, fontWeight: "900" },
  ratingCard: { gap: espacements.md },
  ratingTitle: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    lineHeight: 22,
    fontWeight: "900",
  },
  stars: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: couleurs.surfaceSecondaire,
    borderRadius: rayons.md,
    padding: espacements.sm,
  },
  starButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
