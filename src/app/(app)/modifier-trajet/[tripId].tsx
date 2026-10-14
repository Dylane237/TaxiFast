import { IconCalendar, IconInfoCircle, IconTrash } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const [corridorId, setCorridorId] = useState("");
  const [sens, setSens] = useState<SensTrajet>("ALLER");
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const [capacity, setCapacity] = useState("");
  const [departure, setDeparture] = useState("");
  const corridor = corridors.data?.find((item) => item.id === corridorId);
  const orderedStopIds = useMemo(
    () => corridor ? ordonnerArrets(corridor.stops, selectedStopIds, sens) : [],
    [corridor, selectedStopIds, sens],
  );

  useEffect(() => {
    if (!trip || initializedId === trip.id) return;
    const firstPosition = trip.tripStops[0]?.stop.position ?? 0;
    const lastPosition = trip.tripStops.at(-1)?.stop.position ?? 0;
    setCorridorId(trip.corridorId);
    setSens(firstPosition <= lastPosition ? "ALLER" : "RETOUR");
    setSelectedStopIds(trip.tripStops.map((stop) => stop.stopId));
    setCapacity(String(trip.capacity));
    setDeparture(formatLocalDateTime(trip.departureAt));
    setInitializedId(trip.id);
  }, [initializedId, trip]);

  const update = useMutation({
    mutationFn: async () => {
      const departureAt = parseLocalDateTime(departure);
      const parsedCapacity = Number(capacity);
      if (!corridor || orderedStopIds.length < 2) throw new Error("Choisissez un axe et au moins deux arrêts.");
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
    setCorridorId(id);
    setSelectedStopIds([]);
  };
  const toggleStop = (id: string) => setSelectedStopIds((current) =>
    current.includes(id) ? current.filter((stopId) => stopId !== id) : [...current, id],
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
        <EntetePage title="Modifier le trajet" description="Axe, arrêts, départ et capacité peuvent être ajustés." />
        {pending ? <MessageEtat>Chargement du trajet…</MessageEtat> : null}
        {error ? <MessageEtat type="erreur">{messageErreur(error)}</MessageEtat> : null}
        {!pending && !error && !trip ? <MessageEtat type="erreur">Trajet introuvable.</MessageEtat> : null}
        {trip && corridor ? (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>AXE</Text>
              <View style={styles.wrap}>{corridors.data?.map((item) => <PuceChoix key={item.id} label={item.name} selected={item.id === corridorId} onPress={() => chooseCorridor(item.id)} />)}</View>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>SENS</Text>
              <View style={styles.wrap}>{(["ALLER", "RETOUR"] as const).map((value) => <PuceChoix key={value} label={value === "ALLER" ? "Aller" : "Retour"} selected={sens === value} onPress={() => { setSens(value); setSelectedStopIds([]); }} />)}</View>
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
              <Champ etiquette="Capacité" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
              <Champ etiquette="Départ (AAAA-MM-JJ HH:mm)" value={departure} onChangeText={setDeparture} autoCapitalize="none" />
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
