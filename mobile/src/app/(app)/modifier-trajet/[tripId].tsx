import { IconArrowLeft, IconArrowRight, IconCheck, IconInfoCircle, IconMinus, IconPlus, IconTrash, IconWallet } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type AvailabilityMode, type Corridor, type Trip } from "@/api";
import { Bouton, Carte, Champ, EntetePage, MessageEtat, PuceChoix } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatLocalDateTime, parseLocalDateTime } from "@/features/date-time-input";
import { RouteMiniMap } from "@/features/route-composer/RouteMiniMap";
import { buildFareDrafts, type FareDraft } from "@/features/route-composer/route-composer";
import { ordonnerArrets, type SensTrajet } from "@/features/trips/trip-form";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export default function EditTripScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const trips = useQuery({ queryKey: ["driver-trips"], queryFn: () => api.listDriverTrips() });
  const corridorsQuery = useQuery({ queryKey: ["corridors"], queryFn: () => api.listCorridors() });
  const trip = trips.data?.find((item) => item.id === tripId);
  const pending = trips.isPending || corridorsQuery.isPending;
  const error = trips.error ?? corridorsQuery.error;

  if (pending || error || !trip || !corridorsQuery.data) {
    return <SafeAreaView style={styles.page} edges={["top", "bottom"]}><View style={styles.state}><EntetePage title="Modifier le trajet" description="Tous les détails de votre publication, au même endroit." />{pending ? <MessageEtat>Chargement du trajet…</MessageEtat> : null}{error ? <MessageEtat type="erreur">{messageErreur(error)}</MessageEtat> : null}{!pending && !error && !trip ? <MessageEtat type="erreur">Trajet introuvable.</MessageEtat> : null}</View></SafeAreaView>;
  }

  return <EditTripForm key={trip.id} trip={trip} corridors={corridorsQuery.data} />;
}

function EditTripForm({ trip, corridors }: { trip: Trip; corridors: Corridor[] }) {
  const queryClient = useQueryClient();
  const vehicleSeats = useAuthStore((state) => state.user?.vehicle?.seats);
  const tripId = trip.id;
  const maxCapacity = vehicleSeats ?? trip.capacity;
  const first = trip.tripStops[0]?.stop.position ?? 0;
  const last = trip.tripStops.at(-1)?.stop.position ?? 0;
  const [corridorId, setCorridorId] = useState(trip.corridorId);
  const [sens, setSens] = useState<SensTrajet>(first <= last ? "ALLER" : "RETOUR");
  const [selectedStopIds, setSelectedStopIds] = useState(() => trip.tripStops.map((stop) => stop.stopId));
  const [capacity, setCapacity] = useState(trip.capacity);
  const [mode, setMode] = useState<AvailabilityMode>(trip.availabilityMode);
  const [departure, setDeparture] = useState(() => formatLocalDateTime(trip.departureAt));
  const [availableUntil, setAvailableUntil] = useState(() => trip.availableUntil ? formatLocalDateTime(trip.availableUntil) : "");
  const [fares, setFares] = useState<FareDraft[]>(() => trip.fares.map(({ fromStopId, toStopId, price }) => ({ fromStopId, toStopId, price })));
  const [fareIndex, setFareIndex] = useState(0);

  const corridor = corridors.find((item) => item.id === corridorId);
  const orderedStopIds = useMemo(() => corridor ? ordonnerArrets(corridor.stops, selectedStopIds, sens) : [], [corridor, selectedStopIds, sens]);
  const selectedStops = useMemo(() => orderedStopIds.map((id) => corridor?.stops.find((stop) => stop.id === id)).filter((stop) => stop !== undefined), [corridor, orderedStopIds]);
  const currentFare = fares[fareIndex];
  const stopById = useMemo(() => new Map(selectedStops.map((stop) => [stop.id, stop])), [selectedStops]);

  const rebuildFares = (stopIds: string[], nextSens = sens, nextCorridor = corridor) => {
    if (!nextCorridor) return;
    const ordered = ordonnerArrets(nextCorridor.stops, stopIds, nextSens);
    const stops = ordered.map((id) => nextCorridor.stops.find((stop) => stop.id === id)!);
    const priceByPair = new Map(fares.map((fare) => [`${fare.fromStopId}:${fare.toStopId}`, fare.price]));
    setFares(buildFareDrafts(stops).map((fare) => ({ ...fare, price: priceByPair.get(`${fare.fromStopId}:${fare.toStopId}`) ?? fare.price })));
    setFareIndex(0);
  };

  const chooseCorridor = (id: string) => {
    const next = corridors.find((item) => item.id === id);
    if (!next) return;
    const ids = next.stops.map((stop) => stop.id);
    setCorridorId(id);
    setSens("ALLER");
    setSelectedStopIds(ids);
    rebuildFares(ids, "ALLER", next);
  };
  const chooseSens = (nextSens: SensTrajet) => {
    setSens(nextSens);
    rebuildFares(selectedStopIds, nextSens);
  };
  const toggleStop = (id: string) => {
    const next = selectedStopIds.includes(id) ? selectedStopIds.filter((stopId) => stopId !== id) : [...selectedStopIds, id];
    setSelectedStopIds(next);
    rebuildFares(next);
  };

  const update = useMutation({
    mutationFn: async () => {
      const departureAt = parseLocalDateTime(departure);
      const endAt = availableUntil.trim() ? parseLocalDateTime(availableUntil) : null;
      if (!corridor || orderedStopIds.length < 2) throw new Error("Choisissez un itinéraire et au moins deux arrêts.");
      if (capacity > maxCapacity) throw new Error(`Votre véhicule autorise au maximum ${maxCapacity} places.`);
      if (!departureAt || new Date(departureAt) <= new Date()) throw new Error("Saisissez une date de départ future.");
      if (availableUntil.trim() && !endAt) throw new Error("Saisissez une fin de disponibilité valide.");
      if (endAt && new Date(endAt) <= new Date(departureAt)) throw new Error("La fin de disponibilité doit suivre le départ.");
      if (fares.some((fare) => !Number.isInteger(fare.price) || fare.price <= 0)) throw new Error("Chaque tarif doit être un entier supérieur à 0 FCFA.");
      return api.updateTrip(tripId!, { corridorId: corridor.id, stopIds: orderedStopIds, capacity, departureAt, availableUntil: endAt, availabilityMode: mode, fares });
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
  const confirmCancel = () => Alert.alert("Annuler ce trajet ?", "Les propositions et réservations actives seront annulées. Cette action est définitive.", [
    { text: "Conserver", style: "cancel" },
    { text: "Annuler le trajet", style: "destructive", onPress: () => cancel.mutate() },
  ]);
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <EntetePage title="Modifier le trajet" description="Tous les détails de votre publication, au même endroit." />
        {corridor ? <>
          <RouteMiniMap stops={selectedStops} compact />
          <Section title="Itinéraire">
            <View style={styles.wrap}>{corridors.map((item) => <PuceChoix key={item.id} label={item.name} selected={item.id === corridorId} onPress={() => chooseCorridor(item.id)} />)}</View>
            <View style={styles.wrap}>{(["ALLER", "RETOUR"] as const).map((value) => <PuceChoix key={value} label={value === "ALLER" ? "Aller" : "Retour"} selected={sens === value} onPress={() => chooseSens(value)} />)}</View>
          </Section>
          <Section title="Arrêts desservis" detail="Touchez un point pour l’ajouter ou le retirer.">
            <Carte style={styles.stopList}>{[...corridor.stops].sort((a, b) => sens === "ALLER" ? a.position - b.position : b.position - a.position).map((stop, index, list) => {
              const sequence = orderedStopIds.indexOf(stop.id);
              const endpoint = sequence === 0 || sequence === orderedStopIds.length - 1;
              return <Pressable key={stop.id} accessibilityRole="checkbox" accessibilityState={{ checked: sequence >= 0 }} onPress={() => toggleStop(stop.id)} style={[styles.stopRow, index === list.length - 1 && styles.lastRow]}><View style={[styles.number, sequence >= 0 && styles.numberSelected]}>{sequence >= 0 ? <IconCheck color={couleurs.texte} size={15} /> : null}</View><View style={styles.flex}><Text style={styles.stopName}>{stop.name}</Text><Text style={styles.stopMeta}>{endpoint ? (sequence === 0 ? "Départ" : "Destination") : sequence >= 0 ? `Arrêt ${sequence}` : "Non desservi"}</Text></View></Pressable>;
            })}</Carte>
          </Section>
          <Section title="Disponibilité">
            <View style={styles.modeGrid}>{(["IMMEDIATE", "SCHEDULED"] as const).map((value) => <Pressable key={value} onPress={() => setMode(value)} style={[styles.mode, mode === value && styles.modeActive]}><Text style={styles.modeTitle}>{value === "IMMEDIATE" ? "Je pars maintenant" : "Je prévois"}</Text><Text style={styles.modeDetail}>{value === "IMMEDIATE" ? "Visible immédiatement" : "Départ planifié"}</Text></Pressable>)}</View>
            <Carte style={styles.form}><Champ etiquette="Départ (AAAA-MM-JJ HH:mm)" value={departure} onChangeText={setDeparture} autoCapitalize="none" /><Champ etiquette="Disponible jusqu’au (facultatif)" value={availableUntil} onChangeText={setAvailableUntil} autoCapitalize="none" /></Carte>
          </Section>
          <Section title="Places et tarifs" detail="La capacité est vérifiée séparément sur chaque tronçon.">
            <Carte style={styles.capacityCard}><Text style={styles.capacityLabel}>Places proposées</Text><View style={styles.counter}><Pressable disabled={capacity <= 1} onPress={() => setCapacity((value) => Math.max(1, value - 1))} style={[styles.counterButton, capacity <= 1 && styles.disabled]}><IconMinus color={couleurs.texte} size={20} /></Pressable><Text style={styles.counterValue}>{capacity}</Text><Pressable disabled={capacity >= maxCapacity} onPress={() => setCapacity((value) => Math.min(maxCapacity, value + 1))} style={[styles.counterButton, capacity >= maxCapacity && styles.disabled]}><IconPlus color={couleurs.texte} size={20} /></Pressable></View></Carte>
            {currentFare ? <Carte style={styles.fareCard}><View style={styles.fareHeading}><View style={styles.flex}><Text style={styles.eyebrow}>TARIF {fareIndex + 1} SUR {fares.length}</Text><Text style={styles.fareTitle}>{stopById.get(currentFare.fromStopId)?.name} → {stopById.get(currentFare.toStopId)?.name}</Text></View><IconWallet color={couleurs.texteSecondaire} size={21} /></View><Champ etiquette="Prix en FCFA" value={String(currentFare.price)} keyboardType="number-pad" onChangeText={(value) => setFares((current) => current.map((fare, index) => index === fareIndex ? { ...fare, price: Number(value.replace(/\s/g, "")) || 0 } : fare))} /><View style={styles.fareNav}><Pressable disabled={fareIndex === 0} onPress={() => setFareIndex((value) => value - 1)} style={[styles.navButton, fareIndex === 0 && styles.disabled]}><IconArrowLeft color={couleurs.texte} size={18} /><Text style={styles.navText}>Précédent</Text></Pressable><Pressable disabled={fareIndex === fares.length - 1} onPress={() => setFareIndex((value) => value + 1)} style={[styles.navButton, fareIndex === fares.length - 1 && styles.disabled]}><Text style={styles.navText}>Suivant</Text><IconArrowRight color={couleurs.texte} size={18} /></Pressable></View></Carte> : <MessageEtat type="erreur">Sélectionnez au moins deux arrêts pour configurer les tarifs.</MessageEtat>}
          </Section>
          <View style={styles.notice}><IconInfoCircle color={couleurs.texteSecondaire} size={18} /><Text style={styles.noticeText}>Les arrêts d’une réservation confirmée doivent rester présents et dans le même sens.</Text></View>
          {update.isError ? <MessageEtat type="erreur">{messageErreur(update.error)}</MessageEtat> : null}
          <Bouton variante="sombre" chargement={update.isPending} onPress={() => update.mutate()}>Enregistrer les modifications</Bouton>
          {cancel.isError ? <MessageEtat type="erreur">{messageErreur(cancel.error)}</MessageEtat> : null}
          <Bouton variante="fantome" icone={<IconTrash color={couleurs.erreur} size={18} />} chargement={cancel.isPending} onPress={confirmCancel}>Annuler le trajet</Bouton>
        </> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return <View style={styles.section}><View><Text style={styles.sectionTitle}>{title}</Text>{detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}</View>{children}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond }, state: { flex: 1, padding: espacements.lg, gap: espacements.lg }, content: { padding: espacements.lg, paddingBottom: espacements.xxl, gap: 20 }, section: { gap: espacements.md },
  sectionTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "800" }, sectionDetail: { marginTop: 2, color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 18 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: espacements.sm },
  stopList: { paddingVertical: 0 }, stopRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: espacements.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: couleurs.bordure }, lastRow: { borderBottomWidth: 0 },
  number: { width: 28, height: 28, borderRadius: rayons.rond, alignItems: "center", justifyContent: "center", backgroundColor: couleurs.surfaceSecondaire, borderWidth: 1, borderColor: couleurs.bordure }, numberSelected: { backgroundColor: couleurs.primaire, borderColor: couleurs.primairePresse }, flex: { flex: 1, gap: 2 }, stopName: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" }, stopMeta: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro },
  modeGrid: { flexDirection: "row", gap: espacements.sm }, mode: { flex: 1, minHeight: 76, justifyContent: "center", padding: espacements.md, borderRadius: rayons.md, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure }, modeActive: { backgroundColor: couleurs.primaireClaire, borderColor: couleurs.primairePresse }, modeTitle: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" }, modeDetail: { marginTop: 3, color: couleurs.texteSecondaire, fontSize: taillesTexte.micro }, form: { gap: espacements.md },
  capacityCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, capacityLabel: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" }, counter: { flexDirection: "row", alignItems: "center", gap: espacements.md }, counterButton: { width: 40, height: 40, borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire, alignItems: "center", justifyContent: "center" }, counterValue: { minWidth: 22, textAlign: "center", color: couleurs.texte, fontSize: 22, fontWeight: "800" }, disabled: { opacity: 0.3 },
  fareCard: { gap: espacements.md }, fareHeading: { flexDirection: "row", alignItems: "center", gap: espacements.md }, eyebrow: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontWeight: "800", letterSpacing: 0.7 }, fareTitle: { color: couleurs.texte, fontSize: taillesTexte.petit, lineHeight: 19, fontWeight: "800" }, fareNav: { flexDirection: "row", gap: espacements.sm }, navButton: { minHeight: 42, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire }, navText: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "700" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: espacements.sm }, noticeText: { flex: 1, color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 18 },
});
