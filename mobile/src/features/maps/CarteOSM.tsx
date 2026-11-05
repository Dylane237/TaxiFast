import { Camera, GeoJSONSource, Layer, Map, ViewAnnotation } from "@maplibre/maplibre-react-native";
import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { couleurs } from "@/theme";
import { DOUALA, type Coordonnees } from "./distance";

/**
 * Fond OpenStreetMap servi par OpenFreeMap : gratuit, sans clé ni compte.
 * Le style « positron », clair et sobre, laisse ressortir le jaune du trajet.
 */
const STYLE_CARTE = "https://tiles.openfreemap.org/styles/positron";

export type PointCarte = Coordonnees & { type: "depart" | "arrivee" | "arret" };

type CarteOSMProps = {
  /** Position réelle de l'utilisateur, affichée en point bleu. */
  utilisateur?: Coordonnees | null;
  points?: PointCarte[];
  /** Décalage en bas, pour garder les points visibles au-dessus d'une feuille. */
  margeBas?: number;
  /** Trace la ligne du trajet entre les points (seulement quand un taxi relie vraiment ces arrêts). */
  relier?: boolean;
};

function cadrer(points: Coordonnees[]) {
  const lats = points.map((point) => point.latitude);
  const lons = points.map((point) => point.longitude);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] as [number, number, number, number];
}

export const CarteOSM = memo(function CarteOSM({ utilisateur, points = [], margeBas = 0, relier = false }: CarteOSMProps) {
  const reperes = useMemo(() => [...points, ...(utilisateur ? [utilisateur] : [])], [points, utilisateur]);
  const trace = useMemo(
    () => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: points.map((point) => [point.longitude, point.latitude]) },
    }),
    [points],
  );
  const centre = reperes[0] ?? DOUALA;
  const padding = { top: 120, right: 56, bottom: margeBas + 56, left: 56 };

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={STYLE_CARTE}
      // Sur Android, la surface GL par défaut peut passer au-dessus des vues posées sur la carte (la feuille du bas
      // disparaissait après un changement de caméra). La texture se compose comme une vue normale.
      androidView="texture"
      logo={false}
      attribution
      // Mention OpenStreetMap obligatoire : en bas à gauche, juste au-dessus de la feuille, loin des boutons du haut.
      attributionPosition={{ bottom: margeBas + 6, left: 8 }}
      compass={false}
      touchPitch={false}
      touchRotate={false}
    >
      {reperes.length > 1 ? (
        <Camera bounds={cadrer(reperes)} padding={padding} duration={600} />
      ) : (
        <Camera center={[centre.longitude, centre.latitude]} zoom={reperes.length ? 15 : 12} padding={padding} duration={600} />
      )}

      {relier && points.length > 1 ? (
        <GeoJSONSource id="trajet" data={trace}>
          <Layer id="trajet-contour" type="line" paint={{ "line-color": couleurs.surface, "line-width": 9 }} layout={{ "line-cap": "round", "line-join": "round" }} />
          <Layer id="trajet-ligne" type="line" paint={{ "line-color": couleurs.encre, "line-width": 5 }} layout={{ "line-cap": "round", "line-join": "round" }} />
        </GeoJSONSource>
      ) : null}

      {points.map((point, index) => (
        <ViewAnnotation key={`${point.type}-${index}`} lngLat={[point.longitude, point.latitude]}>
          <View style={[styles.repere, point.type === "arrivee" && styles.repereArrivee, point.type === "arret" && styles.repereArret]} />
        </ViewAnnotation>
      ))}

      {utilisateur ? (
        <ViewAnnotation lngLat={[utilisateur.longitude, utilisateur.latitude]}>
          <View style={styles.halo}>
            <View style={styles.moi} />
          </View>
        </ViewAnnotation>
      ) : null}
    </Map>
  );
});

const styles = StyleSheet.create({
  repere: { width: 18, height: 18, borderRadius: 9, backgroundColor: couleurs.surface, borderWidth: 5, borderColor: couleurs.encre },
  repereArrivee: { backgroundColor: couleurs.primaire },
  repereArret: { width: 12, height: 12, borderRadius: 6, borderWidth: 3 },
  halo: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(37, 99, 235, 0.18)", alignItems: "center", justifyContent: "center" },
  moi: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#2563EB", borderWidth: 3, borderColor: couleurs.surface },
});
