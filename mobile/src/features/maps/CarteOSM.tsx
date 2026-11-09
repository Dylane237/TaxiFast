import { Camera, GeoJSONSource, Layer, Map, ViewAnnotation } from "@maplibre/maplibre-react-native";
import { IconCar } from "@tabler/icons-react-native";
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { couleurs, polices } from "@/theme";
import { CAMEROUN, cercle, distanceMetres, type Coordonnees } from "./distance";

/**
 * Fond OpenStreetMap servi par OpenFreeMap : gratuit, sans clé ni compte.
 * Le style « positron », clair et sobre, laisse ressortir le trajet et les repères.
 */
const STYLE_CARTE = "https://tiles.openfreemap.org/styles/positron";
const BLEU_POSITION = "#2563EB";

export type PointCarte = Coordonnees & {
  type: "depart" | "arrivee" | "arret";
  /** Bulle au-dessus du repère, comme sur Yango : le nom de l'arrêt… */
  titre?: string;
  /** … et une précision courte (« à 460 m à pied », « ≈ 12 min »). */
  detail?: string;
};

type CarteOSMProps = {
  /** Position réelle de l'utilisateur : point bleu, avec sa marge d'erreur en mètres. */
  utilisateur?: Coordonnees | null;
  precision?: number | null;
  /** Où cadrer pour l'utilisateur (sa première position), pour que la carte ne saute pas à chaque pas. */
  ancrage?: Coordonnees | null;
  points?: PointCarte[];
  /** Tracé routier [longitude, latitude]. Sans lui, `relier` trace une ligne directe en pointillés. */
  itineraire?: [number, number][] | null;
  relier?: boolean;
  /** Position du taxi pendant le trajet. */
  chauffeur?: Coordonnees | null;
  /** Place prise en bas (feuille) et en haut (boutons), pour garder les repères visibles. */
  margeBas?: number;
  margeHaut?: number;
  /** Petite carte d'aperçu dans une page : pas de déplacement au doigt, pour ne pas gêner le défilement. */
  interactive?: boolean;
  /** Trace en pointillés le chemin à pied entre votre position et l'arrêt de départ. */
  marche?: boolean;
};

function cadrer(points: Coordonnees[]) {
  const lats = points.map((point) => point.latitude);
  const lons = points.map((point) => point.longitude);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] as [number, number, number, number];
}

export const CarteOSM = memo(function CarteOSM({
  utilisateur,
  precision,
  ancrage,
  points = [],
  itineraire,
  relier = false,
  chauffeur,
  margeBas = 0,
  margeHaut = 110,
  interactive = true,
  marche = false,
}: CarteOSMProps) {
  // On cadre sur tout ce qui compte, y compris la route elle-même (elle peut sortir du rectangle des arrêts).
  const cadrage = useMemo(
    () => [
      ...points,
      ...(itineraire ?? []).map(([longitude, latitude]) => ({ latitude, longitude })),
      ...(ancrage ? [ancrage] : []),
      ...(chauffeur ? [chauffeur] : []),
    ],
    [ancrage, chauffeur, itineraire, points],
  );

  const ligne = useMemo(() => {
    const coordonnees = itineraire && itineraire.length > 1
      ? itineraire
      : relier && points.length > 1 ? points.map((point) => [point.longitude, point.latitude] as [number, number]) : null;
    if (!coordonnees) return null;
    return { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: coordonnees } };
  }, [itineraire, points, relier]);
  const lignePrecise = Boolean(itineraire && itineraire.length > 1);

  // Le bout à pied jusqu'à l'arrêt : seulement s'il y a un vrai bout de chemin (de 25 m à 2 km).
  const depart = points.find((point) => point.type === "depart");
  const aPied = useMemo(() => {
    if (!marche || !utilisateur || !depart) return null;
    const metres = distanceMetres(utilisateur, depart);
    if (metres < 25 || metres > 2_000) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [[utilisateur.longitude, utilisateur.latitude], [depart.longitude, depart.latitude]],
      },
    };
  }, [depart, marche, utilisateur]);
  const avecBulles = points.some((point) => point.titre);

  // Le halo ne s'affiche que si l'erreur est assez grande pour se voir, et pas absurde.
  const halo = useMemo(() => {
    if (!utilisateur || !precision || precision < 12 || precision > 2_000) return null;
    return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [cercle(utilisateur, precision)] } };
  }, [precision, utilisateur]);

  const centre = cadrage[0] ?? utilisateur ?? CAMEROUN;
  const marge = interactive ? 56 : 28;
  // Les bulles dépassent au-dessus des repères : on leur garde de la place en haut.
  // Les marges sont en points d'écran (un téléphone fait ~360 à 410 points de large) :
  // juste assez pour qu'une bulle centrée sur un repère au bord ne sorte pas de l'écran.
  const cote = marge + (avecBulles ? 36 : 0);
  const padding = { top: (interactive ? margeHaut : marge) + (avecBulles ? 56 : 0), right: cote, bottom: margeBas + marge, left: cote };

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={STYLE_CARTE}
      // Sur Android, la surface GL par défaut peut passer au-dessus des vues posées sur la carte (la feuille du bas
      // disparaissait après un changement de caméra). La texture se compose comme une vue normale.
      androidView="texture"
      logo={false}
      attribution
      // Mention OpenStreetMap obligatoire : en bas à gauche, juste au-dessus de la feuille.
      attributionPosition={{ bottom: margeBas + 6, left: 8 }}
      compass={false}
      touchPitch={false}
      touchRotate={false}
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
    >
      {cadrage.length > 1 ? (
        <Camera bounds={cadrer(cadrage)} padding={padding} duration={600} />
      ) : (
        <Camera
          center={[centre.longitude, centre.latitude]}
          zoom={cadrage.length || utilisateur ? 15 : 5.4}
          padding={padding}
          duration={600}
        />
      )}

      {halo ? (
        <GeoJSONSource id="precision" data={halo}>
          <Layer id="precision-fond" type="fill" paint={{ "fill-color": BLEU_POSITION, "fill-opacity": 0.12 }} />
          <Layer id="precision-bord" type="line" paint={{ "line-color": BLEU_POSITION, "line-opacity": 0.35, "line-width": 1 }} />
        </GeoJSONSource>
      ) : null}

      {aPied ? (
        <GeoJSONSource id="a-pied" data={aPied}>
          <Layer
            id="a-pied-points"
            type="line"
            paint={{ "line-color": BLEU_POSITION, "line-width": 4, "line-opacity": 0.75, "line-dasharray": [0, 2] }}
            layout={{ "line-cap": "round" }}
          />
        </GeoJSONSource>
      ) : null}

      {ligne ? (
        <GeoJSONSource id="trajet" data={ligne}>
          {/* Une ombre douce, une bordure blanche, puis le trait : le trajet se détache nettement du fond. */}
          <Layer
            id="trajet-ombre"
            type="line"
            paint={{ "line-color": "#000000", "line-opacity": 0.14, "line-width": 14, "line-blur": 6 }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
          <Layer
            id="trajet-contour"
            type="line"
            paint={{ "line-color": couleurs.surface, "line-width": 10 }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
          {/* Deux couches distinctes : MapLibre ne retire pas un pointillé quand la propriété disparaît. */}
          {lignePrecise ? (
            <Layer
              key="trajet-route"
              id="trajet-route"
              type="line"
              paint={{ "line-color": couleurs.encre, "line-width": 6 }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          ) : (
            <Layer
              key="trajet-direct"
              id="trajet-direct"
              type="line"
              paint={{ "line-color": couleurs.encre, "line-width": 4, "line-dasharray": [1.5, 1.5] }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          )}
        </GeoJSONSource>
      ) : null}

      {points.map((point, index) => (
        <ViewAnnotation
          // La carte fige le contenu d'une annotation à sa création : une clé qui suit le texte la recrée quand il change.
          key={`${point.type}-${index}-${point.titre ?? ""}-${point.detail ?? ""}`}
          lngLat={[point.longitude, point.latitude]}
          // Avec une bulle, le repère est posé par sa base : la pointe de l'épingle tombe sur l'arrêt.
          anchor={point.titre ? "bottom" : "center"}
        >
          {point.titre ? <Epingle point={point} /> : <Repere type={point.type} />}
        </ViewAnnotation>
      ))}

      {chauffeur ? (
        <ViewAnnotation lngLat={[chauffeur.longitude, chauffeur.latitude]}>
          <View style={styles.taxi}><IconCar color={couleurs.primaire} size={18} /></View>
        </ViewAnnotation>
      ) : null}

      {utilisateur ? (
        <ViewAnnotation lngLat={[utilisateur.longitude, utilisateur.latitude]}>
          <View style={styles.moi} />
        </ViewAnnotation>
      ) : null}
    </Map>
  );
});

function Repere({ type }: { type: PointCarte["type"] }) {
  if (type === "arrivee") return <View style={styles.arrivee}><View style={styles.arriveeCoeur} /></View>;
  return <View style={type === "depart" ? styles.depart : styles.arret} />;
}

/** Bulle + petite tige + repère : le départ en blanc, l'arrivée en noir, comme les grandes applis de VTC. */
function Epingle({ point }: { point: PointCarte }) {
  const arrivee = point.type === "arrivee";
  return (
    <View style={styles.epingle}>
      <View style={[styles.bulle, arrivee && styles.bulleArrivee]}>
        <Text numberOfLines={1} style={[styles.bulleTitre, arrivee && styles.bulleTitreArrivee]}>{point.titre}</Text>
        {point.detail ? (
          <Text numberOfLines={2} style={[styles.bulleDetail, arrivee && styles.bulleDetailArrivee]}>{point.detail}</Text>
        ) : null}
      </View>
      <View style={[styles.tige, arrivee && styles.tigeArrivee]} />
      <Repere type={point.type} />
    </View>
  );
}

const styles = StyleSheet.create({
  epingle: { alignItems: "center" },
  // Largeur minimale : la carte mesure la bulle avant que tout le texte soit posé, sans elle il se coupait.
  bulle: {
    minWidth: 132,
    maxWidth: 190,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: couleurs.surface,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bulleArrivee: { backgroundColor: couleurs.encre },
  bulleTitre: { color: couleurs.texte, fontSize: 13, fontFamily: polices.texteExtraGras },
  bulleTitreArrivee: { color: couleurs.surface },
  bulleDetail: { marginTop: 1, color: couleurs.texteSecondaire, fontSize: 11, textAlign: "center", fontFamily: polices.texteDemiGras },
  bulleDetailArrivee: { color: couleurs.primaire },
  tige: { width: 2, height: 8, backgroundColor: couleurs.surface },
  tigeArrivee: { backgroundColor: couleurs.encre },
  depart: { width: 20, height: 20, borderRadius: 10, backgroundColor: couleurs.surface, borderWidth: 6, borderColor: couleurs.encre },
  arrivee: { width: 24, height: 24, borderRadius: 7, backgroundColor: couleurs.encre, alignItems: "center", justifyContent: "center" },
  arriveeCoeur: { width: 10, height: 10, borderRadius: 2, backgroundColor: couleurs.primaire },
  arret: { width: 11, height: 11, borderRadius: 6, backgroundColor: couleurs.surface, borderWidth: 3, borderColor: couleurs.texteSecondaire },
  taxi: { width: 34, height: 34, borderRadius: 17, backgroundColor: couleurs.encre, borderWidth: 2, borderColor: couleurs.surface, alignItems: "center", justifyContent: "center" },
  moi: { width: 18, height: 18, borderRadius: 9, backgroundColor: BLEU_POSITION, borderWidth: 3, borderColor: couleurs.surface },
});
