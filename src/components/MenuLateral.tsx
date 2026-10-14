import type { ComponentType } from "react";
import {
  IconCar,
  IconChevronRight,
  IconClock,
  IconHistory,
  IconHome,
  IconInbox,
  IconMapPin,
  IconSearch,
  IconUserCircle,
  IconWallet,
  IconX,
  type IconProps,
} from "@tabler/icons-react-native";
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

type MenuItem = {
  label: string;
  description: string;
  href: Href;
  icon: ComponentType<IconProps>;
};

const commonItems: MenuItem[] = [
  {
    label: "Accueil",
    description: "Vue d’ensemble",
    href: "/accueil",
    icon: IconHome,
  },
  {
    label: "Historique",
    description: "Courses et évaluations",
    href: "/historique",
    icon: IconHistory,
  },
];

const clientItems: MenuItem[] = [
  {
    label: "Trouver un trajet",
    description: "Créer une demande",
    href: "/recherche",
    icon: IconSearch,
  },
  {
    label: "Mes demandes",
    description: "Demandes et offres",
    href: "/mes-demandes",
    icon: IconClock,
  },
];

const driverItems: MenuItem[] = [
  {
    label: "Publier un trajet",
    description: "Choisir un axe et des arrêts",
    href: "/je-pars",
    icon: IconCar,
  },
  {
    label: "Demandes reçues",
    description: "Propositions compatibles",
    href: "/demandes",
    icon: IconInbox,
  },
  {
    label: "Mes trajets",
    description: "Publications et statuts",
    href: "/mes-trajets",
    icon: IconMapPin,
  },
  {
    label: "Trajet en cours",
    description: "Passagers et occupation",
    href: "/trajet-en-cours",
    icon: IconClock,
  },
  {
    label: "Portefeuille",
    description: "Gains et commissions",
    href: "/portefeuille",
    icon: IconWallet,
  },
];

export function MenuLateral() {
  const menuOpen = useNavigationStore((state) => state.menuOpen);
  const closeMenu = useNavigationStore((state) => state.closeMenu);
  const user = useAuthStore((state) => state.user);
  const [progress] = useState(() => new Animated.Value(0));
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.86, 360);

  useEffect(() => {
    if (menuOpen) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 210,
        useNativeDriver: true,
      }).start();
    }
  }, [menuOpen, progress]);

  const dismiss = () => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) closeMenu();
    });
  };

  const navigate = (href: Href) => {
    closeMenu();
    router.push(href);
  };

  const roleItems = user?.role === "DRIVER" ? driverItems : clientItems;
  const items = [commonItems[0]!, ...roleItems, commonItems[1]!];
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  return (
    <Modal
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
      transparent
      visible={menuOpen}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable
            accessibilityLabel="Fermer le menu"
            onPress={dismiss}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.drawer,
            { width: drawerWidth, transform: [{ translateX }] },
          ]}
        >
          <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
            <View style={styles.header}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>CT</Text>
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.product}>Covoiturage Taxi</Text>
                <Text style={styles.role}>
                  {user?.role === "DRIVER"
                    ? "ESPACE CHAUFFEUR"
                    : "ESPACE CLIENT"}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Fermer"
                onPress={dismiss}
                style={styles.closeButton}
              >
                <IconX color={couleurs.texte} size={21} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.menu}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={item.label}
                    onPress={() => navigate(item.href)}
                    style={({ pressed }) => [
                      styles.item,
                      pressed && styles.itemPressed,
                    ]}
                  >
                    <View style={styles.itemIcon}>
                      <Icon
                        color={couleurs.texte}
                        size={20}
                        strokeWidth={1.8}
                      />
                    </View>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.itemDescription}>
                        {item.description}
                      </Text>
                    </View>
                    <IconChevronRight
                      color={couleurs.texteSecondaire}
                      size={18}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigate("/compte" as Href)}
              style={({ pressed }) => [
                styles.account,
                pressed && styles.itemPressed,
              ]}
            >
              <View style={styles.accountAvatar}>
                <IconUserCircle color={couleurs.primaire} size={27} />
              </View>
              <View style={styles.itemCopy}>
                <Text style={styles.accountName}>
                  {user?.name ?? "Mon compte"}
                </Text>
                <Text style={styles.itemDescription}>
                  {user?.phone ?? "Compte et paramètres"}
                </Text>
              </View>
              <IconChevronRight color={couleurs.surface} size={19} />
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row" },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(13, 16, 13, 0.52)",
  },
  drawer: { height: "100%", backgroundColor: couleurs.fond },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.encre,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: couleurs.primaire,
    fontSize: taillesTexte.normal,
    fontWeight: "900",
  },
  headerCopy: { flex: 1, gap: 2 },
  product: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "900",
  },
  role: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: { padding: espacements.md, gap: 4 },
  item: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.sm,
  },
  itemPressed: { backgroundColor: couleurs.surfaceSecondaire, opacity: 0.78 },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCopy: { flex: 1, gap: 2 },
  itemLabel: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "800",
  },
  itemDescription: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
  },
  account: {
    margin: espacements.md,
    padding: espacements.md,
    borderRadius: rayons.lg,
    backgroundColor: couleurs.encre,
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: rayons.rond,
    backgroundColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  accountName: {
    color: couleurs.surface,
    fontSize: taillesTexte.normal,
    fontWeight: "900",
  },
});
