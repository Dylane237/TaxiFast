import {
  IconCheck,
  IconClock,
  IconMapPin,
  IconMinus,
  IconPlus,
  IconRoute,
} from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Corridor } from "@/api";
import { Bouton, Carte, EntetePage, EtatContenu, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import {
  creerCreneaux,
  erreurPublication,
  ordonnerArrets,
  type SensTrajet,
} from "@/features/trips/trip-form";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

function EtatChargement() {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.contenuEtat}>
        <EntetePage title="Je pars" description="Publiez un trajet sur votre itinéraire." />
        <EtatContenu type="chargement" title="Chargement des itinéraires" description="Nous préparons les arrêts disponibles." />
      </View>
    </SafeAreaView>
  );
}

export default function JePars() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const corridorsQuery = useQuery({ queryKey: ["corridors"], queryFn: () => api.listCorridors() });
  const [corridorId, setCorridorId] = useState<string | null>(null);
  const [sens, setSens] = useState<SensTrajet>("ALLER");
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const [capacity, setCapacity] = useState(1);
  const creneaux = useMemo(() => creerCreneaux(new Date()), []);
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [erreurSaisie, setErreurSaisie] = useState<string | null>(null);

  const corridors = corridorsQuery.data ?? [];
  const corridor = corridors.find((item) => item.id === corridorId) ?? corridors[0] ?? null;
  const maxSeats = user?.vehicle?.seats ?? 0;
  const orderedStopIds = corridor ? ordonnerArrets(corridor.stops, selectedStopIds, sens) : [];
  const selectedSlot = creneaux.find((slot) => slot.minutes === selectedMinutes) ?? creneaux[0]!;
  const mutation = useMutation({
    mutationFn: () => api.createTrip({
      corridorId: corridor!.id,
      capacity,
      departureAt: selectedSlot.departureAt,
      stopIds: orderedStopIds,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
    },
  });

  const choisirCorridor = (nextCorridor: Corridor) => {
    setCorridorId(nextCorridor.id);
    setSelectedStopIds([]);
    setErreurSaisie(null);
  };

  const changerSens = (nextSens: SensTrajet) => {
    setSens(nextSens);
    setSelectedStopIds([]);
    setErreurSaisie(null);
  };

  const toggleStop = (stopId: string) => {
    setSelectedStopIds((current) =>
      current.includes(stopId) ? current.filter((id) => id !== stopId) : [...current, stopId],
    );
    setErreurSaisie(null);
  };

  const publier = () => {
    const error = erreurPublication(orderedStopIds, capacity, maxSeats);
    if (!corridor || error) {
      setErreurSaisie(error ?? "Choisissez un itinéraire.");
      return;
    }
    mutation.mutate();
  };

  if (corridorsQuery.isPending) return <EtatChargement />;
  if (corridorsQuery.isError) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.contenuEtat}>
          <EntetePage title="Je pars" description="Publiez un trajet sur votre itinéraire." />
          <MessageEtat type="erreur">{messageErreur(corridorsQuery.error)}</MessageEtat>
          <Bouton onPress={() => corridorsQuery.refetch()}>Réessayer</Bouton>
        </View>
      </SafeAreaView>
    );
  }
  if (!corridors.length || !corridor) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.contenuEtat}>
          <EntetePage title="Je pars" description="Publiez un trajet sur votre itinéraire." />
          <MessageEtat>Aucun itinéraire n’est disponible pour le moment.</MessageEtat>
        </View>
      </SafeAreaView>
    );
  }
  if (!maxSeats) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.contenuEtat}>
          <EntetePage title="Je pars" description="Publiez un trajet sur votre itinéraire." />
          <MessageEtat>Complétez les informations de votre véhicule avant de publier.</MessageEtat>
          <Bouton onPress={() => router.push("/profil")}>Compléter mon profil</Bouton>
        </View>
      </SafeAreaView>
    );
  }
  if (mutation.isSuccess) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.contenuEtat}>
          <View style={styles.succesIcone}><IconCheck color={couleurs.succes} size={36} strokeWidth={2.2} /></View>
          <Text style={styles.titreSucces}>Trajet publié</Text>
          <MessageEtat type="succes">Votre trajet est maintenant visible pour les clients compatibles.</MessageEtat>
          <Bouton onPress={() => router.replace("/mes-trajets")}>Voir mes trajets</Bouton>
          <Bouton variante="secondaire" onPress={() => mutation.reset()}>Publier un autre trajet</Bouton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <EntetePage title="Je pars" description="Choisissez l’itinéraire, les arrêts desservis et votre heure de départ." />

        <View style={styles.section}>
          <Text style={styles.sectionTitre}>ITINÉRAIRE</Text>
          <View style={styles.chips}>
            {corridors.map((item) => {
              const active = item.id === corridor.id;
              return (
                <Pressable key={item.id} accessibilityRole="button" onPress={() => choisirCorridor(item)} style={[styles.chip, active && styles.chipActif]}>
                  <IconRoute color={couleurs.texte} size={18} />
                  <Text style={[styles.chipTexte, active && styles.chipTexteActif]}>{item.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitre}>SENS DU TRAJET</Text>
          <View style={styles.ligneDeuxColonnes}>
            {(["ALLER", "RETOUR"] as const).map((value) => {
              const active = sens === value;
              return (
                <Pressable key={value} onPress={() => changerSens(value)} style={[styles.optionLarge, active && styles.optionActive]}>
                  <Text style={[styles.optionTexte, active && styles.optionTexteActif]}>{value === "ALLER" ? "Aller" : "Retour"}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitre}>ARRÊTS DESSERVIS</Text>
          <Text style={styles.aide}>Sélectionnez au moins deux arrêts. Leur numéro indique l’ordre du trajet.</Text>
          <Carte style={styles.listeArrets}>
            {[...corridor.stops]
              .sort((a, b) => sens === "ALLER" ? a.position - b.position : b.position - a.position)
              .map((stop) => {
                const sequence = orderedStopIds.indexOf(stop.id);
                const selected = sequence >= 0;
                return (
                  <Pressable key={stop.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggleStop(stop.id)} style={styles.arret}>
                    <View style={[styles.numero, selected && styles.numeroActif]}>
                      {selected ? <Text style={styles.numeroTexteActif}>{sequence + 1}</Text> : <IconMapPin color={couleurs.texteSecondaire} size={18} />}
                    </View>
                    <Text style={[styles.arretNom, selected && styles.arretNomActif]}>{stop.name}</Text>
                    {selected ? <IconCheck color={couleurs.succes} size={20} /> : null}
                  </Pressable>
                );
              })}
          </Carte>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitre}>HEURE DE DÉPART</Text>
          <View style={styles.chips}>
            {creneaux.map((slot) => {
              const active = slot.minutes === selectedMinutes;
              return (
                <Pressable key={slot.minutes} onPress={() => setSelectedMinutes(slot.minutes)} style={[styles.chip, active && styles.chipActif]}>
                  <IconClock color={couleurs.texte} size={18} />
                  <Text style={[styles.chipTexte, active && styles.chipTexteActif]}>{slot.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitre}>PLACES PROPOSÉES</Text>
          <Carte style={styles.compteur}>
            <Pressable accessibilityLabel="Retirer une place" disabled={capacity <= 1} onPress={() => setCapacity((value) => Math.max(1, value - 1))} style={[styles.boutonCompteur, capacity <= 1 && styles.desactive]}>
              <IconMinus color={couleurs.texte} size={24} />
            </Pressable>
            <View style={styles.valeurCompteur}>
              <Text style={styles.nombre}>{capacity}</Text>
              <Text style={styles.aide}>sur {maxSeats} disponibles</Text>
            </View>
            <Pressable accessibilityLabel="Ajouter une place" disabled={capacity >= maxSeats} onPress={() => setCapacity((value) => Math.min(maxSeats, value + 1))} style={[styles.boutonCompteur, capacity >= maxSeats && styles.desactive]}>
              <IconPlus color={couleurs.texte} size={24} />
            </Pressable>
          </Carte>
        </View>

        {erreurSaisie ? <MessageEtat type="erreur">{erreurSaisie}</MessageEtat> : null}
        {mutation.isError ? <MessageEtat type="erreur">{messageErreur(mutation.error)}</MessageEtat> : null}
        <Bouton chargement={mutation.isPending} onPress={publier}>Publier le trajet</Bouton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espacements.lg, paddingBottom: espacements.xxl, gap: espacements.xl },
  contenuEtat: { flex: 1, justifyContent: "center", padding: espacements.lg, gap: espacements.lg },
  section: { gap: espacements.md, paddingTop: espacements.sm },
  sectionTitre: { color: couleurs.texteSecondaire, fontSize: 11, fontWeight: "900", letterSpacing: 1.25 },
  aide: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 19 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: espacements.sm },
  chip: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: espacements.sm, paddingHorizontal: espacements.md, borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire },
  chipActif: { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
  chipTexte: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "700" },
  chipTexteActif: { color: couleurs.texte },
  ligneDeuxColonnes: { flexDirection: "row", gap: espacements.sm },
  optionLarge: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: rayons.md, backgroundColor: couleurs.surfaceSecondaire },
  optionActive: { backgroundColor: couleurs.primaire },
  optionTexte: { color: couleurs.texteSecondaire, fontWeight: "700" },
  optionTexteActif: { color: couleurs.texte },
  listeArrets: { paddingVertical: espacements.sm, paddingHorizontal: espacements.md },
  arret: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: espacements.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: couleurs.bordure },
  numero: { width: 32, height: 32, borderRadius: rayons.rond, alignItems: "center", justifyContent: "center", backgroundColor: couleurs.fond },
  numeroActif: { backgroundColor: couleurs.primaire },
  numeroTexteActif: { color: couleurs.texte, fontWeight: "900" },
  arretNom: { flex: 1, color: couleurs.texteSecondaire, fontSize: taillesTexte.normal },
  arretNomActif: { color: couleurs.texte, fontWeight: "700" },
  compteur: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  boutonCompteur: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: rayons.md, backgroundColor: couleurs.primaireClaire },
  desactive: { opacity: 0.35 },
  valeurCompteur: { alignItems: "center", gap: espacements.xs },
  nombre: { color: couleurs.texte, fontSize: taillesTexte.titre, fontWeight: "800" },
  titreSucces: { color: couleurs.texte, fontSize: taillesTexte.titre, fontWeight: "900" },
  succesIcone: { width: 72, height: 72, borderRadius: rayons.rond, backgroundColor: couleurs.succesClaire, alignItems: "center", justifyContent: "center" },
});
