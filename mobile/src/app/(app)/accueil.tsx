import { IconArrowRight, IconCurrentLocation, IconMapPin, IconRoute } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api";
import { Apparition, AvatarUtilisateur, Bouton, Carte, LogoMarque, PressionDouce } from "@/components";
import { CarteOSM, type PointCarte } from "@/features/maps/CarteOSM";
import { formatDistance } from "@/features/maps/distance";
import { useDepartProche } from "@/features/maps/useDepartProche";
import { usePosition } from "@/features/maps/usePosition";
import { useVille } from "@/features/maps/useGeo";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, ombres, polices, rayons, taillesTexte } from "@/theme";

export default function Accueil() {
  const user = useAuthStore((state) => state.user);
  if (user?.role === "DRIVER") return <DriverHome firstName={user.name?.split(" ")[0]} />;
  return <ClientHome firstName={user?.name?.split(" ")[0]} />;
}

/**
 * Accueil client : la vraie carte, votre position, et deux questions seulement.
 * D'où partez-vous (l'arrêt le plus proche est proposé d'office) et où allez-vous.
 */
function ClientHome({ firstName }: { firstName?: string }) {
  const marges = useSafeAreaInsets();
  const corridorsQuery = useQuery({ queryKey: ["corridors"], queryFn: () => api.listCorridors() });
  const corridors = useMemo(() => corridorsQuery.data ?? [], [corridorsQuery.data]);
  const { etat, position, precision, ancrage, proche, tropLoin, relocaliser } = useDepartProche(corridors, { demander: true });
  const ville = useVille(ancrage);
  const [hauteurBas, setHauteurBas] = useState(260);

  const points = useMemo<PointCarte[]>(() => {
    const arret = proche?.arret;
    if (arret?.latitude == null || arret.longitude == null) return [];
    return [{
      type: "depart",
      latitude: arret.latitude,
      longitude: arret.longitude,
      titre: arret.name,
      detail: `À ${formatDistance(proche!.distance)} à pied`,
    }];
  }, [proche]);

  const depart = (() => {
    if (proche) return { titre: proche.arret.name, detail: `À ${formatDistance(proche.distance)} de vous, à pied` };
    if (etat.statut === "attente") return { titre: "On vous localise…", detail: "Votre arrêt le plus proche arrive" };
    if (etat.statut === "refusee") return { titre: "Choisir mon départ", detail: "Localisation désactivée" };
    if (etat.statut === "indisponible") return { titre: "Choisir mon départ", detail: "Position introuvable pour l’instant" };
    if (tropLoin) return { titre: "Choisir mon départ", detail: "Aucun arrêt Taxi Fast près de vous" };
    return { titre: "Choisir mon départ", detail: corridorsQuery.isError ? "Les arrêts n’ont pas pu être chargés" : "On cherche l’arrêt le plus proche…" };
  })();

  const ouvrir = (champ: "depart" | "arrivee") =>
    router.push({ pathname: "/recherche", params: proche ? { champ, depart: proche.arret.id } : { champ } });

  return (
    <View style={styles.clientPage}>
      <CarteOSM utilisateur={position} precision={precision} ancrage={ancrage} points={points} marche margeBas={hauteurBas} margeHaut={marges.top + 90} />

      <Apparition style={[styles.mapTopbar, { top: marges.top + espacements.sm }]}>
        <View style={styles.clientBrand}><LogoMarque taille={38} /><View><Text style={styles.clientBrandName}>Taxi Fast</Text><Text numberOfLines={1} style={styles.online}>{ville ? `${ville} · En service` : "En service"}</Text></View></View>
        <AvatarUtilisateur compact />
      </Apparition>

      <View pointerEvents="box-none" style={styles.basEcran} onLayout={(event) => setHauteurBas(Math.round(event.nativeEvent.layout.height))}>
        <PressionDouce
          accessibilityLabel="Me localiser"
          hitSlop={6}
          onPress={relocaliser}
          style={({ pressed }) => [styles.recentrer, pressed && styles.pressed]}
        >
          <IconCurrentLocation color={etat.statut === "trouvee" ? "#2563EB" : couleurs.texte} size={22} />
        </PressionDouce>

        <Apparition delai={90} style={[styles.clientSheet, { paddingBottom: espacements.lg + marges.bottom }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.clientEyebrow}>BONJOUR{firstName ? `, ${firstName.toUpperCase()}` : ""}</Text>
          <View style={styles.trajet}>
            <View style={styles.relieur} />
            <PressionDouce accessibilityLabel={`Départ : ${depart.titre}`} onPress={() => ouvrir("depart")} style={({ pressed }) => [styles.ligne, pressed && styles.lignePressee]}>
              <View style={styles.pointDepart} />
              <View style={styles.ligneCopie}>
                <Text numberOfLines={1} style={styles.departTitre}>{depart.titre}</Text>
                <Text numberOfLines={1} style={styles.departDetail}>{depart.detail}</Text>
              </View>
            </PressionDouce>
            <View style={styles.separateur} />
            <PressionDouce accessibilityLabel="Choisir où vous allez" onPress={() => ouvrir("arrivee")} style={({ pressed }) => [styles.ligne, pressed && styles.lignePressee]}>
              <View style={styles.pointArrivee} />
              <Text style={styles.arriveeTexte}>Où allez-vous ?</Text>
              <View style={styles.destinationArrow}><IconArrowRight color={couleurs.surface} size={19} /></View>
            </PressionDouce>
          </View>
        </Apparition>
      </View>
    </View>
  );
}

function DriverHome({ firstName }: { firstName?: string }) {
  const { etat } = usePosition({ suivre: false });
  const ville = useVille(etat.statut === "trouvee" ? etat.ancrage : null);
  return <SafeAreaView style={styles.page} edges={["top", "bottom"]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.topbar}><View style={styles.brand}><LogoMarque taille={44} /><View><Text style={styles.brandName}>Taxi Fast</Text><Text style={styles.location}>{ville ? `${ville}, Cameroun` : "Cameroun"}</Text></View></View><AvatarUtilisateur /></View>
    <View style={styles.welcome}><Text style={styles.eyebrow}>ESPACE CHAUFFEUR</Text><Text style={styles.greeting}>Bonjour{firstName ? `, ${firstName}` : ""}</Text><Text style={styles.welcomeDescription}>Dites où vous allez, on vous envoie les clients qui sont sur votre route.</Text></View>
    <View style={styles.hero}><View style={styles.heroTop}><View style={styles.heroIcon}><IconRoute color={couleurs.texte} size={26} /></View><Text style={styles.heroKicker}>NOUVEAU DÉPART</Text></View><Text style={styles.heroTitle}>Vous prenez la route ?</Text><Text style={styles.heroDescription}>Itinéraire, arrêts, heure et prix, et les clients vous voient.</Text><Bouton variante="sombre" icone={<IconArrowRight color={couleurs.surface} size={19} />} onPress={() => router.push("/je-pars")}>Publier un trajet</Bouton></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>À SUIVRE</Text><Text style={styles.sectionHint}>Le reste se trouve dans le menu</Text></View>
    <Carte style={styles.focusCard}><View style={styles.focusIcon}><IconMapPin color={couleurs.texte} size={22} /></View><View style={styles.focusCopy}><Text style={styles.focusTitle}>Trajet en cours</Text><Text style={styles.focusDescription}>Vos clients et vos places libres</Text></View><PressionDouce onPress={() => router.push("/trajet-en-cours")} style={({ pressed }) => [styles.focusAction, pressed && styles.pressed]}><IconArrowRight color={couleurs.texte} size={19} /></PressionDouce></Carte>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  clientPage: { flex: 1, backgroundColor: couleurs.fond },
  mapTopbar: { position: "absolute", left: espacements.lg, right: espacements.lg, minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: espacements.sm, borderRadius: rayons.lg, backgroundColor: "rgba(255,255,255,0.96)", ...ombres.carte },
  clientBrand: { flexDirection: "row", alignItems: "center", gap: espacements.sm }, clientBrandName: { color: couleurs.texte, fontSize: taillesTexte.normal, letterSpacing: -0.3, fontFamily: polices.texteExtraGras }, online: { marginTop: 1, color: couleurs.texteSecondaire, fontSize: 10, fontFamily: polices.texteDemiGras },
  basEcran: { position: "absolute", left: 0, right: 0, bottom: 0 },
  recentrer: { alignSelf: "flex-end", marginRight: espacements.lg, marginBottom: espacements.md, width: 48, height: 48, borderRadius: rayons.rond, backgroundColor: couleurs.surface, alignItems: "center", justifyContent: "center", ...ombres.carte },
  clientSheet: { paddingHorizontal: espacements.lg, paddingTop: espacements.sm, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: couleurs.surface, ...ombres.feuille },
  sheetHandle: { width: 40, height: 4, alignSelf: "center", marginBottom: espacements.md, borderRadius: rayons.rond, backgroundColor: couleurs.bordure },
  clientEyebrow: { marginBottom: espacements.sm, color: couleurs.texteSecondaire, fontSize: 10, letterSpacing: 1, fontFamily: polices.texteGras },
  trajet: { borderRadius: rayons.lg, backgroundColor: couleurs.surfaceSecondaire, overflow: "hidden" },
  // Le trait vertical qui relie le point de départ au point d'arrivée, comme sur un ticket.
  relieur: { position: "absolute", left: 21, top: 38, bottom: 38, width: 2, backgroundColor: couleurs.bordure },
  ligne: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: espacements.md, paddingLeft: espacements.md, paddingRight: espacements.sm },
  lignePressee: { backgroundColor: couleurs.bordure },
  pointDepart: { width: 12, height: 12, marginLeft: 4, borderRadius: rayons.rond, backgroundColor: couleurs.surface, borderWidth: 3, borderColor: couleurs.encre },
  pointArrivee: { width: 12, height: 12, marginLeft: 4, borderRadius: 3, backgroundColor: couleurs.primaire, borderWidth: 2, borderColor: couleurs.encre },
  ligneCopie: { flex: 1, gap: 2 },
  departTitre: { color: couleurs.texte, fontSize: taillesTexte.normal, fontFamily: polices.texteExtraGras },
  departDetail: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontFamily: polices.texteDemiGras },
  separateur: { height: StyleSheet.hairlineWidth, marginLeft: 44, backgroundColor: couleurs.desactive },
  arriveeTexte: { flex: 1, color: couleurs.texte, fontSize: 22, letterSpacing: -0.6, fontFamily: polices.titre },
  destinationArrow: { width: 42, height: 42, borderRadius: rayons.rond, backgroundColor: couleurs.encre, alignItems: "center", justifyContent: "center" },
  page: { flex: 1, backgroundColor: couleurs.fond }, content: { padding: espacements.lg, paddingBottom: espacements.xxl, gap: espacements.lg }, topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, brand: { flexDirection: "row", alignItems: "center", gap: espacements.sm }, brandName: { color: couleurs.texte, fontSize: taillesTexte.petit, fontFamily: polices.texteExtraGras }, location: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, marginTop: 1, fontFamily: polices.texte }, welcome: { gap: espacements.xs, paddingTop: espacements.sm }, eyebrow: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, letterSpacing: 1.1, fontFamily: polices.texteGras }, greeting: { color: couleurs.texte, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, fontFamily: polices.titre }, welcomeDescription: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 19, maxWidth: 330, fontFamily: polices.texte }, hero: { borderRadius: rayons.xl, padding: espacements.lg, gap: espacements.md, overflow: "hidden", backgroundColor: couleurs.primaire }, heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, heroIcon: { width: 50, height: 50, borderRadius: rayons.md, backgroundColor: "rgba(255,255,255,0.55)", alignItems: "center", justifyContent: "center" }, heroKicker: { color: couleurs.texte, fontSize: taillesTexte.micro, letterSpacing: 1, fontFamily: polices.texteGras }, heroTitle: { color: couleurs.texte, fontSize: 27, lineHeight: 31, letterSpacing: -0.6, fontFamily: polices.titre }, heroDescription: { color: "#49400F", fontSize: taillesTexte.petit, lineHeight: 19, maxWidth: 315, fontFamily: polices.texte }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: espacements.sm }, sectionTitle: { color: couleurs.texte, fontSize: taillesTexte.micro, letterSpacing: 1.1, fontFamily: polices.texteGras }, sectionHint: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontFamily: polices.texte }, focusCard: { flexDirection: "row", alignItems: "center", gap: espacements.md, padding: espacements.md }, focusIcon: { width: 46, height: 46, borderRadius: rayons.md, backgroundColor: couleurs.surfaceSecondaire, alignItems: "center", justifyContent: "center" }, focusCopy: { flex: 1, gap: 3 }, focusTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontFamily: polices.texteExtraGras }, focusDescription: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, fontFamily: polices.texte }, focusAction: { width: 40, height: 40, borderRadius: rayons.rond, backgroundColor: couleurs.primaire, alignItems: "center", justifyContent: "center" }, pressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
});
