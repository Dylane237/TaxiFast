import { IconArrowLeft, IconCheck, IconClock, IconRoute, IconWallet } from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type AvailabilityMode, type Stop } from "@/api";
import { Bouton, Carte, Champ, EntetePage, EtatContenu, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatDateTime, formatPrice } from "@/features/format";
import { CityMapBackdrop } from "@/features/maps/CityMapBackdrop";
import { PlaceSearch } from "@/features/route-composer/PlaceSearch";
import { RouteMiniMap } from "@/features/route-composer/RouteMiniMap";
import { WizardProgress } from "@/features/route-composer/WizardProgress";
import { buildAvailability, findRouteSelection, nearestStop } from "@/features/route-composer/route-composer";
import { couleurs, espacements, ombres, rayons, taillesTexte } from "@/theme";

const labels = ["VOTRE TRAJET", "HORAIRE ET PRIX", "VÉRIFICATION"];
const LOCATION_TIMEOUT_MS = 8_000;

async function currentPositionWithTimeout() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Position indisponible. Choisissez un point de départ dans la liste.")),
          LOCATION_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function RechercheScreen() {
  const corridorsQuery = useQuery({ queryKey: ["corridors"], queryFn: () => api.listCorridors() });
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState<Stop | null>(null);
  const [to, setTo] = useState<Stop | null>(null);
  const [mode, setMode] = useState<AvailabilityMode>("IMMEDIATE");
  const [startMinutes, setStartMinutes] = useState(30);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [price, setPrice] = useState("1500");
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const corridors = useMemo(() => corridorsQuery.data ?? [], [corridorsQuery.data]);
  const route = useMemo(() => findRouteSelection(corridors, from?.id ?? "", to?.id ?? ""), [corridors, from, to]);
  const availability = useMemo(() => buildAvailability(mode, startMinutes, durationMinutes), [durationMinutes, mode, startMinutes]);
  const parsedPrice = Number(price.replace(/\s/g, ""));
  const mutation = useMutation({
    mutationFn: () => api.createTripRequest({
      corridorId: route!.corridor.id,
      fromStopId: from!.id,
      toStopId: to!.id,
      windowStart: availability.departureAt,
      windowEnd: availability.availableUntil,
      proposedPrice: parsedPrice,
    }),
    onSuccess: (request) => router.replace({ pathname: "/demande/[requestId]", params: { requestId: request.id } }),
  });

  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Autorisez la localisation pour utiliser votre position.");
      const current = await currentPositionWithTimeout();
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
      return setStep(1);
    }
    if (step === 1) {
      if (!Number.isInteger(parsedPrice) || parsedPrice < 100) return setError("Proposez un prix entier d’au moins 100 FCFA.");
      return setStep(2);
    }
    mutation.mutate();
  };

  if (corridorsQuery.isPending) return <State><EtatContenu type="chargement" title="Préparation de votre recherche" description="Chargement des adresses et points de rencontre…" /></State>;
  if (corridorsQuery.isError) return <State><EtatContenu type="erreur" title="Recherche indisponible" description={messageErreur(corridorsQuery.error)} action={<Bouton onPress={() => void corridorsQuery.refetch()}>Réessayer</Bouton>} /></State>;
  if (!corridors.length) return <State><EtatContenu type="vide" title="Aucun itinéraire disponible" description="Revenez lorsque des itinéraires auront été publiés." /></State>;

  if (step === 0) return <View style={styles.mapPage}>
    <CityMapBackdrop route={Boolean(route)} destinationLabel={to?.name} />
    <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill} edges={["top", "bottom"]}>
      <Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={({ pressed }) => [styles.mapBack, pressed && styles.pressed]}><IconArrowLeft color={couleurs.texte} size={24} /></Pressable>
      <View style={styles.mapStatus}><Text style={styles.mapStatusLabel}>{route ? "ITINÉRAIRE TROUVÉ" : "RECHERCHE DE TRAJET"}</Text><Text numberOfLines={1} style={styles.mapStatusValue}>{route ? `${from?.name} → ${to?.name}` : "Douala, Cameroun"}</Text></View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.mapSheetWrap}>
        <View style={styles.mapSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.mapHeading}><Text style={styles.mapTitle}>Votre trajet</Text><Text style={styles.mapSubtitle}>Choisissez vos points de rencontre.</Text></View>
          {error ? <View style={styles.mapFeedback}><MessageEtat type="erreur">{error}</MessageEtat></View> : null}
          <ScrollView contentContainerStyle={styles.placeScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <PlaceSearch corridors={corridors} from={from} to={to} onFrom={setFrom} onTo={setTo} onCurrentLocation={() => void locate()} locating={locating} />
          </ScrollView>
          <View style={styles.mapFooter}><Bouton onPress={next}>{route ? "Continuer" : "Choisir le trajet"}</Bouton></View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>;

  return <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <EntetePage title="Où allez-vous ?" description="Trouvez votre trajet en quelques étapes." />
      <WizardProgress step={step} total={3} label={labels[step]!} />

      {step === 0 ? <View style={styles.stage}>
        <Text style={styles.hero}>Choisissez votre trajet</Text>
        <Text style={styles.subtitle}>Recherchez vos points de montée et de descente, ou partez de votre position.</Text>
        <RouteMiniMap stops={route?.stops ?? [from, to].filter((stop): stop is Stop => Boolean(stop))} compact />
        <PlaceSearch corridors={corridors} from={from} to={to} onFrom={setFrom} onTo={setTo} onCurrentLocation={() => void locate()} locating={locating} />
      </View> : null}

      {step === 1 ? <View style={styles.stage}>
        <Text style={styles.hero}>Quand souhaitez-vous partir ?</Text>
        <Text style={styles.subtitle}>Indiquez votre fenêtre de disponibilité et le prix que vous proposez.</Text>
        <View style={styles.modeGrid}>
          <Choice active={mode === "IMMEDIATE"} title="Maintenant" detail="Recherche immédiate" icon={<IconRoute color={couleurs.texte} size={22} />} onPress={() => setMode("IMMEDIATE")} />
          <Choice active={mode === "SCHEDULED"} title="Plus tard" detail="Planifier le départ" icon={<IconClock color={couleurs.texte} size={22} />} onPress={() => setMode("SCHEDULED")} />
        </View>
        {mode === "SCHEDULED" ? <Options label="DÉPART DANS" values={[30, 60, 120]} value={startMinutes} onChange={setStartMinutes} /> : null}
        <Options label="JE SUIS FLEXIBLE PENDANT" values={[30, 60, 120]} value={durationMinutes} onChange={setDurationMinutes} />
        <View style={styles.priceHeading}><IconWallet color={couleurs.texteSecondaire} size={22} /><View><Text style={styles.priceTitle}>Votre proposition</Text><Text style={styles.priceDetail}>Le chauffeur pourra l’accepter ou contre-proposer une fois.</Text></View></View>
        <Champ etiquette="Prix proposé (FCFA)" value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="1 500" />
      </View> : null}

      {step === 2 && route ? <View style={styles.stage}>
        <Text style={styles.hero}>Confirmez votre demande</Text><Text style={styles.subtitle}>Votre demande sera signalée aux chauffeurs compatibles.</Text>
        <RouteMiniMap stops={route.stops} />
        <Carte style={styles.summary}><Summary label="Montée" value={from!.name} /><Summary label="Descente" value={to!.name} /><Summary label="Fenêtre" value={`${formatDateTime(availability.departureAt)} — ${new Date(availability.availableUntil).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`} /><Summary label="Prix proposé" value={formatPrice(parsedPrice)} last /></Carte>
      </View> : null}

      {error ? <MessageEtat type="erreur">{error}</MessageEtat> : null}
      {mutation.isError ? <MessageEtat type="erreur">{messageErreur(mutation.error)}</MessageEtat> : null}
    </ScrollView>
    <View style={styles.footer}>{step > 0 ? <View style={styles.back}><Bouton variante="secondaire" onPress={() => setStep((value) => value - 1)}>Retour</Bouton></View> : null}<View style={styles.next}><Bouton variante={step === 2 ? "sombre" : "primaire"} chargement={mutation.isPending} onPress={next}>{step === 2 ? "Envoyer ma demande" : "Continuer"}</Bouton></View></View>
  </SafeAreaView>;
}

function Choice({ active, title, detail, icon, onPress }: { active: boolean; title: string; detail: string; icon: React.ReactNode; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>{icon}<Text style={styles.choiceTitle}>{title}</Text><Text style={styles.choiceDetail}>{detail}</Text>{active ? <View style={styles.check}><IconCheck color={couleurs.encre} size={14} /></View> : null}</Pressable>;
}
function Options({ label, values, value, onChange }: { label: string; values: number[]; value: number; onChange: (value: number) => void }) {
  return <View style={styles.options}><Text style={styles.eyebrow}>{label}</Text><View style={styles.pills}>{values.map((item) => <Pressable key={item} onPress={() => onChange(item)} style={[styles.pill, item === value && styles.pillActive]}><Text style={styles.pillText}>{item < 60 ? `${item} min` : `${item / 60} h`}</Text></Pressable>)}</View></View>;
}
function Summary({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.summaryRow, last && styles.summaryLast]}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}
function State({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.page}><View style={styles.state}><EntetePage title="Où allez-vous ?" description="Trouvez votre trajet en quelques étapes." />{children}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  mapPage: { flex: 1, backgroundColor: couleurs.fond },
  mapBack: { position: "absolute", left: espacements.lg, top: 46, width: 48, height: 48, zIndex: 2, borderRadius: rayons.rond, backgroundColor: "rgba(255,255,255,0.96)", alignItems: "center", justifyContent: "center", ...ombres.carte },
  mapStatus: { position: "absolute", left: 76, right: espacements.lg, top: 46, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: espacements.md, borderRadius: rayons.rond, backgroundColor: "rgba(255,255,255,0.96)", ...ombres.carte },
  mapStatusLabel: { color: couleurs.texteSecondaire, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 }, mapStatusValue: { marginTop: 1, color: couleurs.texte, fontSize: taillesTexte.micro, fontWeight: "900" },
  mapSheetWrap: { position: "absolute", left: 0, right: 0, bottom: 0, height: "69%", justifyContent: "flex-end" },
  mapSheet: { flex: 1, overflow: "hidden", borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: couleurs.surface, ...ombres.feuille },
  sheetHandle: { width: 42, height: 4, alignSelf: "center", marginTop: espacements.sm, borderRadius: rayons.rond, backgroundColor: couleurs.bordure },
  mapHeading: { paddingHorizontal: espacements.lg, paddingTop: espacements.md, paddingBottom: espacements.sm }, mapTitle: { color: couleurs.texte, fontSize: 24, lineHeight: 28, fontWeight: "900", letterSpacing: -0.7 }, mapSubtitle: { marginTop: 2, color: couleurs.texteSecondaire, fontSize: taillesTexte.petit },
  mapFeedback: { paddingHorizontal: espacements.lg, paddingBottom: espacements.sm },
  placeScroll: { paddingHorizontal: espacements.lg, paddingBottom: espacements.md },
  mapFooter: { paddingHorizontal: espacements.lg, paddingTop: espacements.sm, paddingBottom: espacements.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: couleurs.bordure, backgroundColor: couleurs.surface },
  page: { flex: 1, backgroundColor: couleurs.fond }, content: { padding: espacements.lg, paddingBottom: 108, gap: 18 }, state: { flex: 1, padding: espacements.lg, gap: espacements.lg }, stage: { gap: 14 }, hero: { color: couleurs.texte, fontSize: 24, lineHeight: 29, fontWeight: "800" }, subtitle: { marginTop: -6, color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 18 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: espacements.sm, paddingHorizontal: espacements.lg, paddingTop: espacements.sm, paddingBottom: espacements.md, backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.bordure, ...ombres.feuille }, back: { width: 98 }, next: { flex: 1 },
  modeGrid: { flexDirection: "row", gap: espacements.sm }, choice: { flex: 1, minHeight: 122, padding: espacements.md, gap: 6, borderRadius: rayons.md, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure }, choiceActive: { borderColor: couleurs.primairePresse, backgroundColor: couleurs.primaireClaire }, choiceTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "800" }, choiceDetail: { color: couleurs.texteSecondaire, fontSize: 12, lineHeight: 17 }, check: { position: "absolute", right: espacements.md, top: espacements.md, width: 23, height: 23, borderRadius: rayons.rond, backgroundColor: couleurs.primaire, alignItems: "center", justifyContent: "center" },
  options: { gap: espacements.sm }, eyebrow: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontWeight: "900", letterSpacing: 0.8 }, pills: { flexDirection: "row", gap: espacements.sm }, pill: { flex: 1, minHeight: 46, borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire, alignItems: "center", justifyContent: "center" }, pillActive: { backgroundColor: couleurs.primaire }, pillText: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" },
  priceHeading: { flexDirection: "row", alignItems: "center", gap: espacements.md }, priceTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900" }, priceDetail: { color: couleurs.texteSecondaire, fontSize: 12, lineHeight: 17, maxWidth: 280 },
  summary: { paddingVertical: 0 }, summaryRow: { paddingVertical: espacements.md, gap: 3, borderBottomWidth: 1, borderBottomColor: couleurs.bordure }, summaryLast: { borderBottomWidth: 0 }, summaryLabel: { color: couleurs.texteSecondaire, fontSize: 12, fontWeight: "700" }, summaryValue: { color: couleurs.texte, fontSize: taillesTexte.petit, lineHeight: 20, fontWeight: "900" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
