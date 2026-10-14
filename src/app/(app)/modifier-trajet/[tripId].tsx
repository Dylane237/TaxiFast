import { IconCalendar, IconInfoCircle, IconTrash } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import { Bouton, Carte, Champ, EntetePage, MessageEtat, PuceChoix } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatLocalDateTime, parseLocalDateTime } from "@/features/date-time-input";
import { ordonnerArrets, type SensTrajet } from "@/features/trips/trip-form";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export default function EditTripScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const queryClient = useQueryClient();
  const trips = useQuery({ queryKey: ["driver-trips"], queryFn: () => api.listDriverTrips() });
  const corridors = useQuery({ queryKey: ["corridors"], queryFn: () => api.listCorridors() });
  const trip = trips.data?.find((item) => item.id === tripId);
  const [corridorOverride, setCorridorOverride] = useState<string | null>(null);
  const [sensOverride, setSensOverride] = useState<SensTrajet | null>(null);
  const [stopsOverride, setStopsOverride] = useState<string[] | null>(null);
  const [capacityOverride, setCapacityOverride] = useState<string | null>(null);
  const [departureOverride, setDepartureOverride] = useState<string | null>(null);
  const corridorId = corridorOverride ?? trip?.corridorId ?? "";
  const initialSens: SensTrajet = (trip?.tripStops[0]?.stop.position ?? 0) <= (trip?.tripStops.at(-1)?.stop.position ?? 0) ? "ALLER" : "RETOUR";
  const sens = sensOverride ?? initialSens;
  const selectedStopIds = stopsOverride ?? trip?.tripStops.map((stop) => stop.stopId) ?? [];
  const capacity = capacityOverride ?? (trip ? String(trip.capacity) : "");
  const departure = departureOverride ?? (trip ? formatLocalDateTime(trip.departureAt) : "");
  const corridor = corridors.data?.find((item) => item.id === corridorId);
  const orderedStopIds = corridor
    ? ordonnerArrets(corridor.stops, selectedStopIds, sens)
    : [];

  const update = useMutation({
    mutationFn: async () => {
      const departureAt = parseLocalDateTime(departure);
      const parsedCapacity = Number(capacity);
      if (!corridor || orderedStopIds.length < 2) throw new Error("Choisissez un itinéraire et au moins deux arrêts.");
      if (!departureAt || new Date(departureAt) <= new Date()) throw new Error("Saisissez une date future au format indiqué.");
      if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) throw new Error("Saisissez une capacité valide.");
      return api.updateTrip(tripId!, { corridorId: corridor.id, stopIds: orderedStopIds, capacity: parsedCapacity, departureAt });
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

  const chooseCorridor = (id: string) => {
    setCorridorOverride(id);
    setStopsOverride([]);
  };
  const toggleStop = (id: string) => setStopsOverride((current) => {
    const base = current ?? trip?.tripStops.map((stop) => stop.stopId) ?? [];
    return base.includes(id) ? base.filter((stopId) => stopId !== id) : [...base, id];
  }
  );
  const confirmCancel = () => Alert.alert("Annuler ce trajet ?", "Les propositions et réservations actives seront annulées. Cette action est définitive.", [
    { text: "Conserver", style: "cancel" },
    { text: "Annuler le trajet", style: "destructive", onPress: () => cancel.mutate() },
  ]);
  const pending = trips.isPending || corridors.isPending;
  const error = trips.error ?? corridors.error;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <EntetePage title="Modifier le trajet" description="Itinéraire, arrêts, départ et capacité peuvent être ajustés." />
        {pending ? <MessageEtat>Chargement du trajet…</MessageEtat> : null}
        {error ? <MessageEtat type="erreur">{messageErreur(error)}</MessageEtat> : null}
        {!pending && !error && !trip ? <MessageEtat type="erreur">Trajet introuvable.</MessageEtat> : null}
        {trip && corridor ? (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>ITINÉRAIRE</Text>
              <View style={styles.wrap}>{corridors.data?.map((item) => <PuceChoix key={item.id} label={item.name} selected={item.id === corridorId} onPress={() => chooseCorridor(item.id)} />)}</View>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>SENS</Text>
              <View style={styles.wrap}>{(["ALLER", "RETOUR"] as const).map((value) => <PuceChoix key={value} label={value === "ALLER" ? "Aller" : "Retour"} selected={sens === value} onPress={() => { setSensOverride(value); setStopsOverride([]); }} />)}</View>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>ARRÊTS DESSERVIS</Text>
              <Carte style={styles.stopList}>
                {[...corridor.stops].sort((a, b) => sens === "ALLER" ? a.position - b.position : b.position - a.position).map((stop) => {
                  const sequence = orderedStopIds.indexOf(stop.id);
                  return <Pressable key={stop.id} accessibilityRole="checkbox" accessibilityState={{ checked: sequence >= 0 }} onPress={() => toggleStop(stop.id)} style={styles.stopRow}>
                    <View style={[styles.number, sequence >= 0 && styles.numberSelected]}><Text style={[styles.numberText, sequence >= 0 && styles.numberTextSelected]}>{sequence >= 0 ? sequence + 1 : "–"}</Text></View>
                    <Text style={styles.stopName}>{stop.name}</Text>
                  </Pressable>;
                })}
              </Carte>
            </View>
            <Carte style={styles.form}>
              <Champ etiquette="Capacité" value={capacity} onChangeText={setCapacityOverride} keyboardType="number-pad" />
              <Champ etiquette="Départ (AAAA-MM-JJ HH:mm)" value={departure} onChangeText={setDepartureOverride} autoCapitalize="none" />
            </Carte>
            <View style={styles.notice}><IconInfoCircle color={couleurs.texteSecondaire} size={18} /><Text style={styles.noticeText}>Les arrêts utilisés par une réservation confirmée doivent rester présents et dans le même sens.</Text></View>
            {update.isError ? <MessageEtat type="erreur">{messageErreur(update.error)}</MessageEtat> : null}
            <Bouton icone={<IconCalendar color={couleurs.texte} size={19} />} chargement={update.isPending} onPress={() => update.mutate()}>Enregistrer</Bouton>
            {cancel.isError ? <MessageEtat type="erreur">{messageErreur(cancel.error)}</MessageEtat> : null}
            <Bouton variante="fantome" icone={<IconTrash color={couleurs.erreur} size={19} />} chargement={cancel.isPending} onPress={confirmCancel}>Annuler le trajet</Bouton>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: { padding: espacements.lg, paddingBottom: espacements.xxl, gap: espacements.lg },
  section: { gap: espacements.sm },
  label: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontWeight: "900", letterSpacing: 1.1 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: espacements.sm },
  stopList: { paddingVertical: 0 },
  stopRow: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: espacements.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: couleurs.bordure },
  number: { width: 30, height: 30, borderRadius: rayons.rond, alignItems: "center", justifyContent: "center", backgroundColor: couleurs.surfaceSecondaire },
  numberSelected: { backgroundColor: couleurs.encre },
  numberText: { color: couleurs.texteSecondaire, fontWeight: "900" },
  numberTextSelected: { color: couleurs.surface },
  stopName: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "700" },
  form: { gap: espacements.md },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: espacements.sm },
  noticeText: { flex: 1, color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 20 },
});
