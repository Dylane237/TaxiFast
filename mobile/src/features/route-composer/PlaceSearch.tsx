import { IconBuildingCommunity, IconCurrentLocation, IconMapPin, IconX } from "@tabler/icons-react-native";
import { useMemo, useRef, useState, type RefObject } from "react";
import { ActivityIndicator, Keyboard, StyleSheet, Text, TextInput, View } from "react-native";
import type { Corridor, Stop } from "@/api";
import { PressionDouce } from "@/components";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";
import type { Lieu } from "@/api/geo";
import { arretLePlusProche, distanceMetres, formatDistance, type ArretProche, type Coordonnees } from "@/features/maps/distance";
import { useRechercheLieux } from "@/features/maps/useGeo";
import { searchStops } from "./route-composer";

/** Au-delà, un lieu n'a pas vraiment d'arrêt Taxi Fast à côté : on le dit plutôt que d'envoyer loin. */
const ARRET_MAX_M = 2_000;

type Champ = "from" | "to";

/** Le raccourci « partir de ma position », déjà formulé par l'écran selon l'état du GPS. */
export type ActionPosition = { libelle: string; detail: string; onPress?: () => void };

type PlaceSearchProps = {
  corridors: Corridor[];
  from: Stop | null;
  to: Stop | null;
  onFrom: (stop: Stop | null) => void;
  onTo: (stop: Stop | null) => void;
  /** Le champ qui prend la main à l'ouverture (clavier ouvert). */
  champInitial?: Champ | null;
  /** Petite ligne sous le départ, par exemple « À 350 m de vous ». */
  detailDepart?: string | null;
  maPosition?: ActionPosition | null;
  /** Votre position, pour proposer d'abord les lieux proches. */
  position?: Coordonnees | null;
};

/**
 * Deux champs, comme sur un ticket : départ puis arrivée.
 * Aucune liste par défaut : les arrêts n'apparaissent que pendant que vous tapez.
 */
export function PlaceSearch({ corridors, from, to, onFrom, onTo, champInitial = null, detailDepart, maPosition, position = null }: PlaceSearchProps) {
  const [actif, setActif] = useState<Champ | null>(champInitial);
  const [recherche, setRecherche] = useState("");
  const refDepart = useRef<TextInput>(null);
  const refArrivee = useRef<TextInput>(null);
  const texte = recherche.trim();

  const resultats = useMemo(() => {
    if (!actif || !texte) return [];
    const autre = actif === "from" ? to : from;
    return searchStops(corridors, texte, actif === "to" && from ? from.corridorId : undefined).filter((stop) => stop.id !== autre?.id);
  }, [actif, corridors, from, texte, to]);

  // Les lieux (quartiers, carrefours, marchés…) partout au Cameroun, chacun relié à son arrêt le plus proche.
  const recherchePlaces = useRechercheLieux(actif ? recherche : "", position);
  // Les arrêts possibles pour ce champ : l'axe du départ pour l'arrivée, et jamais l'arrêt déjà pris dans l'autre champ.
  const axesPossibles = useMemo(() => {
    const autre = actif === "from" ? to : from;
    const axes = actif === "to" && from ? corridors.filter((corridor) => corridor.id === from.corridorId) : corridors;
    return axes.map((corridor) => ({ ...corridor, stops: corridor.stops.filter((stop) => stop.id !== autre?.id) }));
  }, [actif, corridors, from, to]);
  // D'abord les lieux qu'un taxi dessert, puis les plus proches de vous : un « Marché » à 40 km passe après le vôtre.
  const lieux = useMemo(() => {
    const avecArret = recherchePlaces.lieux.map((lieu) => {
      const proche = arretLePlusProche(axesPossibles, lieu);
      return { lieu, proche, desservi: proche !== null && proche.distance <= ARRET_MAX_M, eloignement: position ? distanceMetres(position, lieu) : 0 };
    });
    return avecArret.sort((a, b) => Number(b.desservi) - Number(a.desservi) || a.eloignement - b.eloignement);
  }, [axesPossibles, position, recherchePlaces.lieux]);

  const terminer = () => {
    setActif(null);
    Keyboard.dismiss();
  };

  const choisir = (stop: Stop) => {
    setRecherche("");
    if (actif === "from") {
      onFrom(stop);
      const arriveeValable = to !== null && to.corridorId === stop.corridorId;
      if (!arriveeValable) {
        if (to) onTo(null);
        refArrivee.current?.focus();
        return;
      }
    } else {
      onTo(stop);
    }
    terminer();
  };

  const focaliser = (champ: Champ) => {
    setActif(champ);
    setRecherche("");
  };

  const sansResultat = actif !== null && texte.length > 0 && resultats.length === 0 && lieux.length === 0 && !recherchePlaces.chargement;
  const montrerPosition = actif === "from" && !texte && maPosition;

  return (
    <View style={styles.root}>
      <View style={styles.ticket}>
        <View style={styles.relieur} />
        <ChampLieu
          refInput={refDepart}
          type="from"
          valeur={from?.name ?? ""}
          detail={detailDepart}
          placeholder="D’où partez-vous ?"
          actif={actif === "from"}
          recherche={recherche}
          autoFocus={champInitial === "from"}
          onFocus={() => focaliser("from")}
          onChangeText={setRecherche}
          onBlur={() => { if (!texte) setActif((courant) => (courant === "from" ? null : courant)); }}
          onEffacer={() => { onFrom(null); refDepart.current?.focus(); }}
        />
        <View style={styles.separateur} />
        <ChampLieu
          refInput={refArrivee}
          type="to"
          valeur={to?.name ?? ""}
          placeholder="Où allez-vous ?"
          actif={actif === "to"}
          recherche={recherche}
          autoFocus={champInitial === "to"}
          onFocus={() => focaliser("to")}
          onChangeText={setRecherche}
          onBlur={() => { if (!texte) setActif((courant) => (courant === "to" ? null : courant)); }}
          onEffacer={() => { onTo(null); refArrivee.current?.focus(); }}
        />
      </View>

      {montrerPosition ? (
        <PressionDouce
          disabled={!maPosition.onPress}
          onPress={() => { maPosition.onPress?.(); if (to) terminer(); else refArrivee.current?.focus(); }}
          style={({ pressed }) => [styles.position, pressed && styles.pressed]}
        >
          <View style={styles.positionIcone}><IconCurrentLocation color="#2563EB" size={19} /></View>
          <View style={styles.resultCopy}>
            <Text style={styles.resultName}>{maPosition.libelle}</Text>
            <Text numberOfLines={1} style={styles.resultDetail}>{maPosition.detail}</Text>
          </View>
        </PressionDouce>
      ) : null}

      {resultats.length ? (
        <View style={styles.results}>
          {resultats.map((stop) => (
            <PressionDouce key={stop.id} onPress={() => choisir(stop)} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
              <View style={styles.resultIcon}><IconMapPin color={couleurs.texte} size={18} /></View>
              <View style={styles.resultCopy}>
                <Text style={styles.resultName}>{stop.name}</Text>
                <Text numberOfLines={1} style={styles.resultDetail}>{stop.meetingInstructions ?? "Point de rencontre"}</Text>
              </View>
            </PressionDouce>
          ))}
        </View>
      ) : null}

      {actif && texte.length >= 2 && (lieux.length || recherchePlaces.chargement) ? (
        <View style={styles.results}>
          <View style={styles.sectionLieux}>
            <Text style={styles.sectionTexte}>LIEUX</Text>
            {recherchePlaces.chargement ? <ActivityIndicator color={couleurs.texteSecondaire} size="small" /> : null}
          </View>
          {lieux.map(({ lieu, proche }) => (
            <LigneLieu key={lieu.id} lieu={lieu} proche={proche} onChoisir={choisir} />
          ))}
        </View>
      ) : null}

      {sansResultat ? (
        <View style={styles.vide}>
          <Text style={styles.resultName}>Aucun arrêt ne s’appelle « {texte} »</Text>
          <Text style={styles.resultDetail}>
            {recherchePlaces.erreur
              ? "La recherche de lieux ne répond pas. Vérifiez votre connexion, ou tapez le nom d’un arrêt."
              : actif === "to" && from ? `Seuls les arrêts de l’axe de ${from.name} sont proposés.` : "Essayez le nom du quartier ou d’un carrefour voisin."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function LigneLieu({ lieu, proche, onChoisir }: { lieu: Lieu; proche: ArretProche | null; onChoisir: (stop: Stop) => void }) {
  const desservi = proche !== null && proche.distance <= ARRET_MAX_M;
  return (
    <PressionDouce
      disabled={!desservi}
      onPress={() => { if (desservi) onChoisir(proche.arret); }}
      style={({ pressed }) => [styles.result, !desservi && styles.nonDesservi, pressed && styles.pressed]}
    >
      <View style={styles.resultIcon}><IconBuildingCommunity color={couleurs.texte} size={18} /></View>
      <View style={styles.resultCopy}>
        <Text numberOfLines={1} style={styles.resultName}>{lieu.nom}</Text>
        <Text numberOfLines={1} style={styles.resultDetail}>{lieu.contexte}</Text>
        <Text numberOfLines={1} style={desservi ? styles.arretProche : styles.resultDetail}>
          {desservi ? `Arrêt ${proche.arret.name} · à ${formatDistance(proche.distance)}` : "Pas encore d’arrêt Taxi Fast près d’ici"}
        </Text>
      </View>
    </PressionDouce>
  );
}

type ChampLieuProps = {
  refInput: RefObject<TextInput | null>;
  type: Champ;
  valeur: string;
  detail?: string | null;
  placeholder: string;
  actif: boolean;
  recherche: string;
  autoFocus: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (texte: string) => void;
  onEffacer: () => void;
};

function ChampLieu({ refInput, type, valeur, detail, placeholder, actif, recherche, autoFocus, onFocus, onBlur, onChangeText, onEffacer }: ChampLieuProps) {
  const affiche = actif ? recherche : valeur;
  return (
    <PressionDouce onPress={() => refInput.current?.focus()} style={[styles.champ, actif && styles.champActif]}>
      <View style={type === "from" ? styles.pointDepart : styles.pointArrivee} />
      <View style={styles.champCopie}>
        <TextInput
          ref={refInput}
          accessibilityLabel={type === "from" ? "Départ" : "Arrivée"}
          autoCorrect={false}
          autoFocus={autoFocus}
          onBlur={onBlur}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder={actif ? "Quartier, carrefour, arrêt…" : placeholder}
          placeholderTextColor={couleurs.texteSecondaire}
          returnKeyType="search"
          selectionColor={couleurs.primairePresse}
          style={[styles.saisie, !valeur && !actif && styles.saisieVide]}
          value={affiche}
        />
        {!actif && valeur && detail ? <Text numberOfLines={1} style={styles.detail}>{detail}</Text> : null}
      </View>
      {affiche ? (
        <PressionDouce
          accessibilityLabel={actif ? "Effacer la saisie" : `Effacer ${type === "from" ? "le départ" : "l’arrivée"}`}
          hitSlop={12}
          onPress={actif ? () => onChangeText("") : onEffacer}
          style={styles.effacer}
        >
          <IconX color={couleurs.texteSecondaire} size={16} />
        </PressionDouce>
      ) : null}
    </PressionDouce>
  );
}

const styles = StyleSheet.create({
  root: { gap: espacements.sm },
  ticket: { borderRadius: rayons.lg, backgroundColor: couleurs.surfaceSecondaire, overflow: "hidden" },
  relieur: { position: "absolute", left: 21, top: 36, bottom: 36, width: 2, backgroundColor: couleurs.bordure },
  champ: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: espacements.md, paddingLeft: espacements.md, paddingRight: espacements.sm, borderWidth: 1.5, borderColor: "transparent", borderRadius: rayons.lg },
  champActif: { backgroundColor: couleurs.surface, borderColor: couleurs.encre },
  separateur: { height: StyleSheet.hairlineWidth, marginLeft: 44, backgroundColor: couleurs.desactive },
  pointDepart: { width: 12, height: 12, marginLeft: 4, borderRadius: rayons.rond, backgroundColor: couleurs.surface, borderWidth: 3, borderColor: couleurs.encre },
  pointArrivee: { width: 12, height: 12, marginLeft: 4, borderRadius: 3, backgroundColor: couleurs.primaire, borderWidth: 2, borderColor: couleurs.encre },
  champCopie: { flex: 1, justifyContent: "center", paddingVertical: espacements.sm },
  saisie: { padding: 0, color: couleurs.texte, fontSize: taillesTexte.normal, fontFamily: polices.texteExtraGras },
  saisieVide: { fontFamily: polices.texteGras },
  detail: { marginTop: 2, color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontFamily: polices.texteDemiGras },
  effacer: { width: 30, height: 30, borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire, alignItems: "center", justifyContent: "center" },
  position: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: espacements.md, paddingHorizontal: espacements.xs },
  positionIcone: { width: 36, height: 36, borderRadius: rayons.rond, backgroundColor: "#E8EFFE", alignItems: "center", justifyContent: "center" },
  results: { gap: 2 },
  result: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: espacements.md, paddingHorizontal: espacements.xs, paddingVertical: 6 },
  resultIcon: { width: 36, height: 36, borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire, alignItems: "center", justifyContent: "center" },
  resultCopy: { flex: 1, gap: 2 },
  resultName: { color: couleurs.texte, fontSize: taillesTexte.petit, fontFamily: polices.texteGras },
  resultDetail: { color: couleurs.texteSecondaire, fontSize: 12, lineHeight: 17, fontFamily: polices.texte },
  sectionLieux: { flexDirection: "row", alignItems: "center", gap: espacements.sm, paddingHorizontal: espacements.xs, paddingTop: espacements.sm },
  sectionTexte: { color: couleurs.texteSecondaire, fontSize: 10, letterSpacing: 1, fontFamily: polices.texteGras },
  arretProche: { color: couleurs.texte, fontSize: 12, lineHeight: 17, fontFamily: polices.texteDemiGras },
  nonDesservi: { opacity: 0.55 },
  vide: { gap: 3, paddingHorizontal: espacements.xs, paddingVertical: espacements.sm },
  pressed: { opacity: 0.72 },
});
