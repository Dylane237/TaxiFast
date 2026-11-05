import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Stop } from "@/api";
import { CarteOSM, type PointCarte } from "@/features/maps/CarteOSM";
import { useItineraire } from "@/features/maps/useGeo";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";

/**
 * Aperçu du trajet sur la vraie carte : arrêts, tracé routier, départ et arrivée.
 * Carte figée (pas de déplacement au doigt) pour ne pas gêner le défilement de la page.
 */
export function RouteMiniMap({ stops, compact = false }: { stops: Stop[]; compact?: boolean }) {
  const points = useMemo<PointCarte[]>(
    () => stops.flatMap((stop, index) => {
      if (stop.latitude === null || stop.longitude === null) return [];
      const type = index === 0 ? "depart" : index === stops.length - 1 ? "arrivee" : "arret";
      return [{ type, latitude: stop.latitude, longitude: stop.longitude }];
    }),
    [stops],
  );
  const itineraire = useItineraire(points.length === stops.length ? points : []);

  return (
    <View style={[styles.root, compact && styles.compact]}>
      {points.length ? (
        <CarteOSM points={points} itineraire={itineraire?.trace} relier interactive={false} margeBas={40} />
      ) : null}
      {stops.length ? (
        <View style={styles.caption}>
          <Text numberOfLines={1} style={styles.captionText}>{stops[0]!.name}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text numberOfLines={1} style={[styles.captionText, styles.end]}>{stops.length > 1 ? stops.at(-1)!.name : "Arrivée à choisir"}</Text>
        </View>
      ) : <Text style={styles.placeholder}>Votre trajet s’affichera ici</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: 200, borderRadius: rayons.lg, backgroundColor: couleurs.surfaceSecondaire, overflow: "hidden", borderWidth: 1, borderColor: couleurs.bordure },
  compact: { height: 160 },
  caption: { position: "absolute", left: espacements.md, right: espacements.md, bottom: espacements.md, flexDirection: "row", alignItems: "center", gap: espacements.sm, borderRadius: rayons.rond, backgroundColor: couleurs.surface, paddingHorizontal: espacements.md, paddingVertical: espacements.sm },
  captionText: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.micro, fontFamily: polices.texteGras },
  end: { textAlign: "right" },
  arrow: { color: couleurs.texteSecondaire, fontFamily: polices.texteExtraGras },
  placeholder: { position: "absolute", alignSelf: "center", top: 64, color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, fontFamily: polices.texteDemiGras },
});
