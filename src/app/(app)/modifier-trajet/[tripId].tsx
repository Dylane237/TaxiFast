import { IconCalendar, IconTrash } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import { Bouton, Carte, Champ, EntetePage, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { couleurs, espacements } from "@/theme";

function localDate(value: string): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function EditTripScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const queryClient = useQueryClient();
  const trips = useQuery({ queryKey: ["driver-trips"], queryFn: () => api.listDriverTrips() });
  const trip = trips.data?.find((item) => item.id === tripId);
  const [capacity, setCapacity] = useState("");
  const [departure, setDeparture] = useState("");
  const displayedCapacity = capacity || (trip ? String(trip.capacity) : "");
  const displayedDeparture = departure || (trip ? localDate(trip.departureAt) : "");

  const update = useMutation({
    mutationFn: async () => {
      const parsedDate = parseLocalDate(displayedDeparture);
      const parsedCapacity = Number(displayedCapacity);
      if (!parsedDate || !Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
        throw new Error("Saisissez une date au format indiqué et une capacité valide.");
      }
      return api.updateTrip(tripId!, { capacity: parsedCapacity, departureAt: parsedDate });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
      router.back();
    },
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelTrip(tripId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
      router.replace("/mes-trajets");
    },
  });

  const confirmCancel = () => Alert.alert(
    "Annuler ce trajet ?",
    "Les propositions et réservations actives seront annulées. Cette action est définitive.",
    [
      { text: "Conserver", style: "cancel" },
      { text: "Annuler le trajet", style: "destructive", onPress: () => cancel.mutate() },
    ],
  );

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <EntetePage title="Modifier le trajet" description="Ajustez le départ ou la capacité avant le voyage." />
        {trips.isPending ? <MessageEtat>Chargement du trajet…</MessageEtat> : null}
        {trips.isError ? <MessageEtat type="erreur">{messageErreur(trips.error)}</MessageEtat> : null}
        {!trips.isPending && !trips.isError && !trip ? <MessageEtat type="erreur">Trajet introuvable.</MessageEtat> : null}
        {trip ? (
          <>
            <Carte style={styles.form}>
              <Champ etiquette="Capacité" value={displayedCapacity} onChangeText={setCapacity} keyboardType="number-pad" />
              <Champ etiquette="Départ (AAAA-MM-JJ HH:mm)" value={displayedDeparture} onChangeText={setDeparture} autoCapitalize="none" />
            </Carte>
            {update.isError ? <MessageEtat type="erreur">{messageErreur(update.error)}</MessageEtat> : null}
            <Bouton icone={<IconCalendar color={couleurs.texte} size={19} />} chargement={update.isPending} onPress={() => update.mutate()}>
              Enregistrer
            </Bouton>
            {cancel.isError ? <MessageEtat type="erreur">{messageErreur(cancel.error)}</MessageEtat> : null}
            <Bouton variante="fantome" icone={<IconTrash color={couleurs.erreur} size={19} />} chargement={cancel.isPending} onPress={confirmCancel}>
              Annuler le trajet
            </Bouton>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: { padding: espacements.lg, paddingBottom: espacements.xxl, gap: espacements.md },
  form: { gap: espacements.md },
});
