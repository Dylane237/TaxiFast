import { IconArrowRight, IconClock, IconCurrentLocation, IconMapPin, IconRoute, IconSearch } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Apparition, AvatarUtilisateur, Bouton, Carte } from "@/components";
import { CityMapBackdrop } from "@/features/maps/CityMapBackdrop";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, ombres, rayons, taillesTexte } from "@/theme";

export default function Accueil() {
  const user = useAuthStore((state) => state.user);
  if (user?.role === "DRIVER") return <DriverHome firstName={user.name?.split(" ")[0]} />;
  return <ClientHome firstName={user?.name?.split(" ")[0]} />;
}

function ClientHome({ firstName }: { firstName?: string }) {
  return (
    <View style={styles.clientPage}>
      <CityMapBackdrop />
      <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill} edges={["top", "bottom"]}>
        <Apparition style={styles.mapTopbar}>
          <View style={styles.clientBrand}><View style={styles.brandMarkSmall}><Text style={styles.brandMarkText}>CT</Text></View><View><Text style={styles.clientBrandName}>TaxiFast</Text><Text style={styles.online}>Douala · Service disponible</Text></View></View>
          <AvatarUtilisateur compact />
        </Apparition>
        <View style={styles.positionBadge}><IconCurrentLocation color={couleurs.texte} size={17} /><View><Text style={styles.positionLabel}>Votre position</Text><Text style={styles.positionValue}>Douala, Cameroun</Text></View></View>
        <Apparition delai={90} style={styles.clientSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.clientHeading}><View><Text style={styles.clientEyebrow}>BONJOUR{firstName ? `, ${firstName.toUpperCase()}` : ""}</Text><Text style={styles.clientTitle}>Où allez-vous ?</Text></View><View style={styles.readyPill}><View style={styles.readyDot} /><Text style={styles.readyText}>Prêt</Text></View></View>
          <Pressable onPress={() => router.push("/recherche")} style={({ pressed }) => [styles.destinationButton, pressed && styles.pressed]}>
            <View style={styles.searchIcon}><IconSearch color={couleurs.texte} size={22} /></View><View style={styles.destinationCopy}><Text style={styles.destinationTitle}>Saisir une destination</Text><Text style={styles.destinationHint}>Départ, arrivée et point de rencontre</Text></View><View style={styles.destinationArrow}><IconArrowRight color={couleurs.surface} size={19} /></View>
          </Pressable>
          <Text style={styles.recentLabel}>DESTINATIONS RÉCENTES</Text>
          <View style={styles.recentList}>
            <QuickPlace icon={<IconMapPin color={couleurs.texte} size={19} />} name="Akwa Palace" detail="Akwa, boulevard de la Liberté" onPress={() => router.push("/recherche")} />
            <QuickPlace icon={<IconClock color={couleurs.texte} size={19} />} name="Bonabéri Centre" detail="Environ 24 min selon le trafic" onPress={() => router.push("/recherche")} last />
          </View>
          <Pressable onPress={() => router.push("/mes-demandes")} style={({ pressed }) => [styles.requestsShortcut, pressed && styles.pressed]}><Text style={styles.requestsText}>Voir mes demandes</Text><IconArrowRight color={couleurs.texte} size={18} /></Pressable>
        </Apparition>
      </SafeAreaView>
    </View>
  );
}

function QuickPlace({ icon, name, detail, onPress, last = false }: { icon: React.ReactNode; name: string; detail: string; onPress: () => void; last?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.quickPlace, !last && styles.quickBorder, pressed && styles.pressed]}><View style={styles.quickIcon}>{icon}</View><View style={styles.quickCopy}><Text style={styles.quickName}>{name}</Text><Text numberOfLines={1} style={styles.quickDetail}>{detail}</Text></View><IconArrowRight color={couleurs.texteSecondaire} size={17} /></Pressable>;
}

function DriverHome({ firstName }: { firstName?: string }) {
  return <SafeAreaView style={styles.page} edges={["top", "bottom"]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.topbar}><View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandMarkText}>CT</Text></View><View><Text style={styles.brandName}>Covoiturage Taxi</Text><Text style={styles.location}>Douala, Cameroun</Text></View></View><AvatarUtilisateur /></View>
    <View style={styles.welcome}><Text style={styles.eyebrow}>ESPACE CHAUFFEUR</Text><Text style={styles.greeting}>Bonjour{firstName ? `, ${firstName}` : ""}</Text><Text style={styles.welcomeDescription}>Publiez votre prochain départ et retrouvez les passagers sur votre itinéraire.</Text></View>
    <View style={styles.hero}><View style={styles.heroTop}><View style={styles.heroIcon}><IconRoute color={couleurs.texte} size={26} /></View><Text style={styles.heroKicker}>NOUVEAU DÉPART</Text></View><Text style={styles.heroTitle}>Vous prenez la route ?</Text><Text style={styles.heroDescription}>Indiquez votre itinéraire, vos arrêts et l’heure de départ.</Text><Bouton variante="sombre" icone={<IconArrowRight color={couleurs.surface} size={19} />} onPress={() => router.push("/je-pars")}>Publier un trajet</Bouton></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>À SUIVRE</Text><Text style={styles.sectionHint}>Le reste est dans votre menu</Text></View>
    <Carte style={styles.focusCard}><View style={styles.focusIcon}><IconMapPin color={couleurs.texte} size={22} /></View><View style={styles.focusCopy}><Text style={styles.focusTitle}>Trajet en cours</Text><Text style={styles.focusDescription}>Passagers, arrêts et occupation</Text></View><Pressable onPress={() => router.push("/trajet-en-cours")} style={({ pressed }) => [styles.focusAction, pressed && styles.pressed]}><IconArrowRight color={couleurs.texte} size={19} /></Pressable></Carte>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  clientPage: { flex: 1, backgroundColor: couleurs.fond },
  mapTopbar: { position: "absolute", left: espacements.lg, right: espacements.lg, top: 46, minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: espacements.sm, borderRadius: rayons.lg, backgroundColor: "rgba(255,255,255,0.96)", ...ombres.carte },
  clientBrand: { flexDirection: "row", alignItems: "center", gap: espacements.sm }, brandMarkSmall: { width: 38, height: 38, borderRadius: 12, backgroundColor: couleurs.encre, alignItems: "center", justifyContent: "center" }, clientBrandName: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900", letterSpacing: -0.3 }, online: { marginTop: 1, color: couleurs.texteSecondaire, fontSize: 10, fontWeight: "700" },
  positionBadge: { position: "absolute", left: espacements.lg, top: 118, flexDirection: "row", alignItems: "center", gap: espacements.sm, paddingHorizontal: espacements.md, paddingVertical: espacements.sm, borderRadius: rayons.rond, backgroundColor: "rgba(255,255,255,0.94)", ...ombres.carte }, positionLabel: { color: couleurs.texte, fontSize: taillesTexte.micro, fontWeight: "900" }, positionValue: { color: couleurs.texteSecondaire, fontSize: 10 },
  clientSheet: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 410, paddingHorizontal: espacements.lg, paddingTop: espacements.sm, paddingBottom: espacements.md, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: couleurs.surface, ...ombres.feuille }, sheetHandle: { width: 42, height: 4, alignSelf: "center", marginBottom: espacements.md, borderRadius: rayons.rond, backgroundColor: couleurs.bordure },
  clientHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: espacements.md }, clientEyebrow: { color: couleurs.texteSecondaire, fontSize: 10, fontWeight: "900", letterSpacing: 1 }, clientTitle: { marginTop: 3, color: couleurs.texte, fontSize: 27, lineHeight: 31, fontWeight: "900", letterSpacing: -0.9 }, readyPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: rayons.rond, backgroundColor: couleurs.succesClaire }, readyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: couleurs.succes }, readyText: { color: couleurs.succes, fontSize: taillesTexte.micro, fontWeight: "900" },
  destinationButton: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: espacements.md, padding: espacements.sm, borderRadius: rayons.lg, backgroundColor: couleurs.surfaceSecondaire }, searchIcon: { width: 48, height: 48, borderRadius: rayons.md, backgroundColor: couleurs.surface, alignItems: "center", justifyContent: "center" }, destinationCopy: { flex: 1, gap: 2 }, destinationTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900" }, destinationHint: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro }, destinationArrow: { width: 40, height: 40, borderRadius: rayons.rond, backgroundColor: couleurs.encre, alignItems: "center", justifyContent: "center" },
  recentLabel: { marginTop: espacements.lg, marginBottom: espacements.xs, color: couleurs.texteSecondaire, fontSize: 10, fontWeight: "900", letterSpacing: 1 }, recentList: { borderRadius: rayons.lg, backgroundColor: couleurs.surface }, quickPlace: { minHeight: 57, flexDirection: "row", alignItems: "center", gap: espacements.md }, quickBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: couleurs.bordure }, quickIcon: { width: 38, height: 38, borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire, alignItems: "center", justifyContent: "center" }, quickCopy: { flex: 1, gap: 2 }, quickName: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "900" }, quickDetail: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro }, requestsShortcut: { minHeight: 44, marginTop: espacements.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: espacements.sm }, requestsText: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" },
  page: { flex: 1, backgroundColor: couleurs.fond }, content: { padding: espacements.lg, paddingBottom: espacements.xxl, gap: espacements.lg }, topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, brand: { flexDirection: "row", alignItems: "center", gap: espacements.sm }, brandMark: { width: 40, height: 40, borderRadius: rayons.md, backgroundColor: couleurs.encre, alignItems: "center", justifyContent: "center" }, brandMarkText: { color: couleurs.primaire, fontSize: taillesTexte.petit, fontWeight: "900" }, brandName: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "900" }, location: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, marginTop: 1 }, welcome: { gap: espacements.xs, paddingTop: espacements.sm }, eyebrow: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontWeight: "900", letterSpacing: 1.1 }, greeting: { color: couleurs.texte, fontSize: 28, lineHeight: 33, fontWeight: "900", letterSpacing: -0.8 }, welcomeDescription: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 19, maxWidth: 330 }, hero: { borderRadius: rayons.xl, padding: espacements.lg, gap: espacements.md, overflow: "hidden", backgroundColor: couleurs.primaire }, heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, heroIcon: { width: 50, height: 50, borderRadius: rayons.md, backgroundColor: "rgba(255,255,255,0.55)", alignItems: "center", justifyContent: "center" }, heroKicker: { color: couleurs.texte, fontSize: taillesTexte.micro, fontWeight: "900", letterSpacing: 1 }, heroTitle: { color: couleurs.texte, fontSize: 27, lineHeight: 31, fontWeight: "900", letterSpacing: -0.6 }, heroDescription: { color: "#49400F", fontSize: taillesTexte.petit, lineHeight: 19, maxWidth: 315 }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: espacements.sm }, sectionTitle: { color: couleurs.texte, fontSize: taillesTexte.micro, fontWeight: "900", letterSpacing: 1.1 }, sectionHint: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro }, focusCard: { flexDirection: "row", alignItems: "center", gap: espacements.md, padding: espacements.md }, focusIcon: { width: 46, height: 46, borderRadius: rayons.md, backgroundColor: couleurs.surfaceSecondaire, alignItems: "center", justifyContent: "center" }, focusCopy: { flex: 1, gap: 3 }, focusTitle: { color: couleurs.texte, fontSize: taillesTexte.normal, fontWeight: "900" }, focusDescription: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit }, focusAction: { width: 40, height: 40, borderRadius: rayons.rond, backgroundColor: couleurs.primaire, alignItems: "center", justifyContent: "center" }, pressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
});
