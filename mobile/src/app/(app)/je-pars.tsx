import { IconArrowLeft, IconArrowRight, IconCheck, IconClock, IconMinus, IconPlus, IconRoute, IconUsers, IconWallet } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type AvailabilityMode, type Stop } from "@/api";
import { Bouton, Carte, Champ, EntetePage, EtatContenu, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatDateTime, formatPrice } from "@/features/format";
import { PlaceSearch } from "@/features/route-composer/PlaceSearch";
import { RouteMiniMap } from "@/features/route-composer/RouteMiniMap";
import { WizardProgress } from "@/features/route-composer/WizardProgress";
import { buildAvailability, buildFareDrafts, findRouteSelection, nearestStop, type FareDraft } from "@/features/route-composer/route-composer";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, ombres, rayons, taillesTexte } from "@/theme";

const labels = ["VOTRE ITINÉRAIRE", "ARRÊTS PROPOSÉS", "DISPONIBILITÉ", "PLACES ET TARIFS", "VÉRIFICATION"];
const startOptions = [30, 60, 120];
const durationOptions = [60, 120, 180];

export default function JePars() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const corridorsQuery = useQuery({ queryKey: ["corridors"], queryFn: () => api.listCorridors() });
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState<Stop | null>(null);
  const [to, setTo] = useState<Stop | null>(null);
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const [mode, setMode] = useState<AvailabilityMode>("IMMEDIATE");
  const [startMinutes, setStartMinutes] = useState(30);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [capacity, setCapacity] = useState(1);
  const [fares, setFares] = useState<FareDraft[]>([]);
  const [fareIndex, setFareIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const corridors = useMemo(() => corridorsQuery.data ?? [], [corridorsQuery.data]);
  const route = useMemo(() => findRouteSelection(corridors, from?.id ?? "", to?.id ?? ""), [corridors, from, to]);
  const selectedStops = useMemo(() => route?.stops.filter((stop) => selectedStopIds.includes(stop.id)) ?? [], [route, selectedStopIds]);
  const maxSeats = user?.vehicle?.seats ?? 0;
  const availability = useMemo(() => buildAvailability(mode, startMinutes, durationMinutes), [durationMinutes, mode, startMinutes]);
  const currentFare = fares[fareIndex];
  const stopById = useMemo(() => new Map(selectedStops.map((stop) => [stop.id, stop])), [selectedStops]);

  const mutation = useMutation({
    mutationFn: () => api.createTrip({
      corridorId: route!.corridor.id,
      capacity,
      departureAt: availability.departureAt,
      availableUntil: availability.availableUntil,
      availabilityMode: mode,
      stopIds: selectedStops.map((stop) => stop.id),
      fares,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
      setStep(5);
    },
  });

  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Autorisez la localisation pour utiliser votre position.");
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const closest = nearestStop(corridors, current.coords.latitude, current.coords.longitude);
      if (!closest) throw new Error("Aucun arrêt géolocalisé n’est disponible.");
      setFrom(closest);
      if (to?.corridorId !== closest.corridorId) setTo(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Localisation impossible.");
    } finally {
      setLocating(false);
    }
  };

  const next = () => {
    setError(null);
    if (step === 0) {
      if (!route) return setError("Choisissez un départ et une destination sur le même itinéraire.");
      setSelectedStopIds(route.stops.map((stop) => stop.id));
      setStep(1);
      return;
    }
    if (step === 1) {
      if (selectedStops.length < 2) return setError("Conservez au moins le départ et la destination.");
      setFares(buildFareDrafts(selectedStops));
      setFareIndex(0);
      setStep(2);
      return;
    }
    if (step === 2) return setStep(3);
    if (step === 3) {
      if (fares.some((fare) => !Number.isInteger(fare.price) || fare.price <= 0)) return setError("Chaque tarif doit être un montant entier supérieur à 0 FCFA.");
      setStep(4);
      return;
    }
    mutation.mutate();
  };

  const toggleStop = (stop: Stop) => {
    if (stop.id === route?.stops[0]?.id || stop.id === route?.stops.at(-1)?.id) return;
    setSelectedStopIds((current) => current.includes(stop.id) ? current.filter((id) => id !== stop.id) : [...current, stop.id]);
  };

  if (corridorsQuery.isPending) return <State><EtatContenu type="chargement" title="Préparation de la publication" description="Chargement des adresses et points de rencontre…" /></State>;
  if (corridorsQuery.isError) return <State><EtatContenu type="erreur" title="Itinéraires indisponibles" description={messageErreur(corridorsQuery.error)} action={<Bouton onPress={() => void corridorsQuery.refetch()}>Réessayer</Bouton>} /></State>;
  if (!corridors.length) return <State><EtatContenu type="vide" title="Aucun itinéraire" description="Aucun point de rencontre n’est encore disponible." /></State>;
  if (!maxSeats) return <State><MessageEtat>Complétez les informations du véhicule avant de publier.</MessageEtat><Bouton onPress={() => router.push("/profil")}>Compléter mon profil</Bouton></State>;
  if (step === 5) return <Success onAgain={() => { setStep(0); setFrom(null); setTo(null); mutation.reset(); }} />;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <EntetePage title="Publier un trajet" description="Construisez votre course étape par étape." />
        <WizardProgress step={step} total={5} label={labels[step]!} />

        {step === 0 ? <View style={styles.stage}>
          <Text style={styles.hero}>D’où partez-vous ?</Text>
          <Text style={styles.subtitle}>Recherchez un lieu ou partez de votre position actuelle.</Text>
          <RouteMiniMap stops={route?.stops ?? [from, to].filter((stop): stop is Stop => Boolean(stop))} compact />
          <PlaceSearch corridors={corridors} from={from} to={to} onFrom={setFrom} onTo={setTo} onCurrentLocation={() => void locate()} locating={locating} />
        </View> : null}

        {step === 1 && route ? <View style={styles.stage}>
          <Text style={styles.hero}>Vos arrêts sur le chemin</Text>
          <Text style={styles.subtitle}>Les points situés entre le départ et l’arrivée sont proposés automatiquement. Touchez un arrêt intermédiaire pour le retirer.</Text>
          <RouteMiniMap stops={selectedStops} />
          <View style={styles.stopRail}>{route.stops.map((stop, index) => {
            const endpoint = index === 0 || index === route.stops.length - 1;
            const selected = selectedStopIds.includes(stop.id);
            return <Pressable key={stop.id} onPress={() => toggleStop(stop)} style={[styles.stopOption, selected && styles.stopOptionSelected]}>
              <View style={[styles.stopDot, selected && styles.stopDotSelected]}>{selected ? <IconCheck color={endpoint ? couleurs.surface : couleurs.encre} size={15} /> : null}</View>
              <View style={styles.stopCopy}><Text style={styles.stopName}>{stop.name}</Text><Text style={styles.stopDetail}>{endpoint ? (index === 0 ? "Départ" : "Destination") : selected ? "Arrêt proposé" : "Non desservi"}</Text></View>
            </Pressable>;
          })}</View>
        </View> : null}

        {step === 2 ? <View style={styles.stage}>
          <Text style={styles.hero}>Quand serez-vous en circulation ?</Text>
          <Text style={styles.subtitle}>Les clients verront la période pendant laquelle votre trajet est disponible.</Text>
          <View style={styles.modeGrid}>
            <ChoiceCard active={mode === "IMMEDIATE"} icon={<IconRoute color={couleurs.texte} size={22} />} title="Je pars maintenant" detail="Disponible dans quelques minutes" onPress={() => setMode("IMMEDIATE")} />
            <ChoiceCard active={mode === "SCHEDULED"} icon={<IconClock color={couleurs.texte} size={22} />} title="Je prévois" detail="Départ planifié plus tard" onPress={() => setMode("SCHEDULED")} />
          </View>
          {mode === "SCHEDULED" ? <OptionGroup label="DÉPART DANS" values={startOptions} value={startMinutes} onChange={setStartMinutes} suffix="min" /> : null}
          <OptionGroup label="DURÉE DE DISPONIBILITÉ" values={durationOptions} value={durationMinutes} onChange={setDurationMinutes} suffix="min" />
          <Carte style={styles.availabilityCard}><IconClock color={couleurs.texte} size={22} /><View style={styles.flex}><Text style={styles.cardLabel}>Créneau proposé</Text><Text style={styles.cardValue}>{formatDateTime(availability.departureAt)} — {new Date(availability.availableUntil).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Text></View></Carte>
        </View> : null}

        {step === 3 && currentFare ? <View style={styles.stage}>
          <Text style={styles.hero}>Places et tarifs</Text>
          <Text style={styles.subtitle}>La capacité reste vérifiée séparément sur chaque tronçon. Ajustez ensuite chaque combinaison de trajet.</Text>
          <Carte style={styles.capacityCard}><View style={styles.capacityHeading}><IconUsers color={couleurs.texte} size={22} /><Text style={styles.cardLabel}>Places proposées</Text></View><View style={styles.counter}>
            <Pressable disabled={capacity <= 1} onPress={() => setCapacity((value) => Math.max(1, value - 1))} style={[styles.counterButton, capacity <= 1 && styles.disabled]}><IconMinus color={couleurs.texte} size={22} /></Pressable>
            <View style={styles.counterCopy}><Text style={styles.counterValue}>{capacity}</Text><Text style={styles.counterLabel}>sur {maxSeats}</Text></View>
            <Pressable disabled={capacity >= maxSeats} onPress={() => setCapacity((value) => Math.min(maxSeats, value + 1))} style={[styles.counterButton, capacity >= maxSeats && styles.disabled]}><IconPlus color={couleurs.texte} size={22} /></Pressable>
          </View></Carte>
          <View style={styles.fareHeading}><View style={styles.flex}><Text style={styles.sectionEyebrow}>TARIF {fareIndex + 1} SUR {fares.length}</Text><Text style={styles.fareTitle}>{stopById.get(currentFare.fromStopId)?.name} → {stopById.get(currentFare.toStopId)?.name}</Text></View><IconWallet color={couleurs.texteSecondaire} size={24} /></View>
          <Champ etiquette="Prix en FCFA" value={String(currentFare.price)} keyboardType="number-pad" onChangeText={(value) => setFares((current) => current.map((fare, index) => index === fareIndex ? { ...fare, price: Number(value.replace(/\s/g, "")) || 0 } : fare))} />
          <View style={styles.fareNavigation}><Pressable disabled={fareIndex === 0} onPress={() => setFareIndex((value) => value - 1)} style={[styles.navButton, fareIndex === 0 && styles.disabled]}><IconArrowLeft color={couleurs.texte} size={20} /><Text style={styles.navText}>Précédent</Text></Pressable><Pressable disabled={fareIndex === fares.length - 1} onPress={() => setFareIndex((value) => value + 1)} style={[styles.navButton, fareIndex === fares.length - 1 && styles.disabled]}><Text style={styles.navText}>Suivant</Text><IconArrowRight color={couleurs.texte} size={20} /></Pressable></View>
        </View> : null}

        {step === 4 && route ? <View style={styles.stage}>
          <Text style={styles.hero}>Tout est prêt</Text><Text style={styles.subtitle}>Vérifiez les informations avant de rendre le trajet visible.</Text><RouteMiniMap stops={selectedStops} />
          <Carte style={styles.summaryCard}><Summary label="Itinéraire" value={`${from?.name} → ${to?.name}`} /><Summary label="Arrêts desservis" value={`${selectedStops.length} points de rencontre`} /><Summary label="Disponibilité" value={`${mode === "IMMEDIATE" ? "Maintenant" : formatDateTime(availability.departureAt)} · ${durationMinutes} min`} /><Summary label="Capacité" value={`${capacity} place${capacity > 1 ? "s" : ""} par tronçon`} /><Summary label="Fourchette" value={`${formatPrice(Math.min(...fares.map((fare) => fare.price)))} — ${formatPrice(Math.max(...fares.map((fare) => fare.price)))}`} last /></Carte>
        </View> : null}

        {error ? <MessageEtat type="erreur">{error}</MessageEtat> : null}
        {mutation.isError ? <MessageEtat type="erreur">{messageErreur(mutation.error)}</MessageEtat> : null}
      </ScrollView>
      <View style={styles.footer}>{step > 0 ? <View style={styles.backButton}><Bouton variante="secondaire" onPress={() => setStep((value) => value - 1)}>Retour</Bouton></View> : null}<View style={styles.nextButton}><Bouton variante={step === 4 ? "sombre" : "primaire"} chargement={mutation.isPending} onPress={next}>{step === 4 ? "Publier le trajet" : "Continuer"}</Bouton></View></View>
    </SafeAreaView>
  );
}

function ChoiceCard({ active, icon, title, detail, onPress }: { active: boolean; icon: React.ReactNode; title: string; detail: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choiceCard, active && styles.choiceCardActive]}>{icon}<Text style={styles.choiceTitle}>{title}</Text><Text style={styles.choiceDetail}>{detail}</Text>{active ? <View style={styles.choiceCheck}><IconCheck color={couleurs.encre} size={15} /></View> : null}</Pressable>;
}
function OptionGroup({ label, values, value, onChange, suffix }: { label: string; values: number[]; value: number; onChange: (value: number) => void; suffix: string }) {
  return <View style={styles.optionGroup}><Text style={styles.sectionEyebrow}>{label}</Text><View style={styles.pills}>{values.map((item) => <Pressable key={item} onPress={() => onChange(item)} style={[styles.pill, value === item && styles.pillActive]}><Text style={styles.pillText}>{item} {suffix}</Text></Pressable>)}</View></View>;
}
function Summary({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.summaryRow, last && styles.summaryLast]}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}
function Success({ onAgain }: { onAgain: () => void }) {
  return <SafeAreaView style={styles.page}><View style={styles.success}><View style={styles.successIcon}><IconCheck color={couleurs.succes} size={38} /></View><Text style={styles.successTitle}>Trajet publié</Text><Text style={styles.successCopy}>Votre itinéraire, votre créneau et vos tarifs sont maintenant visibles.</Text><Bouton variante="sombre" onPress={() => router.replace("/mes-trajets")}>Voir mes trajets</Bouton><Bouton variante="secondaire" onPress={onAgain}>Publier un autre trajet</Bouton></View></SafeAreaView>;
}
function State({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.page}><View style={styles.state}><EntetePage title="Publier un trajet" description="Construisez votre course étape par étape." />{children}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond }, content: { padding: espacements.lg, paddingBottom: 108, gap: 18 }, state: { flex: 1, padding: espacements.lg, gap: espacements.lg }, stage: { gap: 14 },
  hero: { color: couleurs.texte, fontSize: 24, lineHeight: 29, fontWeight: "800" }, subtitle: { marginTop: -6, color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 18 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: espacements.sm, paddingHorizontal: espacements.lg, paddingTop: espacements.sm, paddingBottom: espacements.md, backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.bordure, ...ombres.feuille }, backButton: { width: 98 }, nextButton: { flex: 1 },
  stopRail: { gap: 6 }, stopOption: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: espacements.md, paddingHorizontal: espacements.md, borderRadius: rayons.md, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure }, stopOptionSelected: { borderColor: couleurs.primairePresse }, stopDot: { width: 28, height: 28, borderRadius: rayons.rond, borderWidth: 1, borderColor: couleurs.bordure, alignItems: "center", justifyContent: "center" }, stopDotSelected: { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire }, stopCopy: { flex: 1, gap: 2 }, stopName: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" }, stopDetail: { color: couleurs.texteSecondaire, fontSize: 12 },
  modeGrid: { flexDirection: "row", gap: espacements.sm }, choiceCard: { flex: 1, minHeight: 128, padding: espacements.md, gap: 6, borderRadius: rayons.md, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure }, choiceCardActive: { borderColor: couleurs.primairePresse, backgroundColor: couleurs.primaireClaire }, choiceTitle: { color: couleurs.texte, fontSize: taillesTexte.petit, lineHeight: 18, fontWeight: "800" }, choiceDetail: { color: couleurs.texteSecondaire, fontSize: 12, lineHeight: 17 }, choiceCheck: { position: "absolute", top: espacements.md, right: espacements.md, width: 24, height: 24, borderRadius: rayons.rond, backgroundColor: couleurs.primaire, alignItems: "center", justifyContent: "center" },
  optionGroup: { gap: espacements.sm }, sectionEyebrow: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontWeight: "900", letterSpacing: 0.8 }, pills: { flexDirection: "row", gap: espacements.sm }, pill: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire }, pillActive: { backgroundColor: couleurs.primaire }, pillText: { color: couleurs.texte, fontSize: 12, fontWeight: "800" },
  availabilityCard: { flexDirection: "row", alignItems: "center", gap: espacements.md }, flex: { flex: 1, gap: 2 }, cardLabel: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, fontWeight: "700" }, cardValue: { color: couleurs.texte, fontSize: taillesTexte.petit, lineHeight: 19, fontWeight: "800" },
  capacityCard: { gap: espacements.md }, capacityHeading: { flexDirection: "row", alignItems: "center", gap: espacements.sm }, counter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, counterButton: { width: 46, height: 46, borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire, alignItems: "center", justifyContent: "center" }, disabled: { opacity: 0.32 }, counterCopy: { alignItems: "center" }, counterValue: { color: couleurs.texte, fontSize: 30, fontWeight: "800" }, counterLabel: { color: couleurs.texteSecondaire, fontSize: 12, fontWeight: "700" },
  fareHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacements.md }, fareTitle: { marginTop: espacements.xs, color: couleurs.texte, fontSize: taillesTexte.normal, lineHeight: 22, fontWeight: "900" }, fareNavigation: { flexDirection: "row", justifyContent: "space-between", gap: espacements.sm }, navButton: { minHeight: 46, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: espacements.sm, borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire }, navText: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" },
  summaryCard: { paddingVertical: 0 }, summaryRow: { paddingVertical: espacements.md, borderBottomWidth: 1, borderBottomColor: couleurs.bordure, gap: espacements.xs }, summaryLast: { borderBottomWidth: 0 }, summaryLabel: { color: couleurs.texteSecondaire, fontSize: 12, fontWeight: "700" }, summaryValue: { color: couleurs.texte, fontSize: taillesTexte.petit, lineHeight: 20, fontWeight: "900" },
  success: { flex: 1, justifyContent: "center", padding: espacements.xl, gap: espacements.lg }, successIcon: { width: 64, height: 64, borderRadius: rayons.rond, backgroundColor: couleurs.succesClaire, alignItems: "center", justifyContent: "center" }, successTitle: { color: couleurs.texte, fontSize: 26, fontWeight: "800" }, successCopy: { color: couleurs.texteSecondaire, fontSize: taillesTexte.normal, lineHeight: 21 },
});
