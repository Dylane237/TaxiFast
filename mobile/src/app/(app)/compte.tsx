import {
  IconBell,
  IconCar,
  IconEdit,
  IconLogout,
  IconPhone,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import {
  Bouton,
  Carte,
  EntetePage,
  EtatContenu,
  LigneAction,
  MessageEtat,
} from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import {
  disablePushNotifications,
  enablePushNotifications,
  notificationsEnabled,
} from "@/notifications/push-notifications";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, polices, rayons, taillesTexte } from "@/theme";
import { formatTelephone } from "@/features/format";

export default function CompteScreen() {
  const queryClient = useQueryClient();
  const storedUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const profile = useQuery({
    queryKey: ["current-user"],
    queryFn: () => api.getCurrentUser(),
    initialData: storedUser,
  });
  const signOut = useMutation({
    mutationFn: () => api.signOut(),
    onSuccess: async () => {
      await clearSession();
      queryClient.clear();
      router.replace("/connexion");
    },
  });
  const notificationState = useQuery({
    queryKey: ["notification-settings"],
    queryFn: notificationsEnabled,
  });
  const toggleNotifications = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) await enablePushNotifications();
      else await disablePushNotifications();
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.setQueryData(["notification-settings"], enabled);
    },
  });

  useEffect(() => {
    if (
      profile.data &&
      profile.data.id === storedUser?.id &&
      profile.data !== storedUser
    ) {
      void updateUser(profile.data);
    }
  }, [profile.data, storedUser, updateUser]);

  if (profile.isPending) {
    return (
      <Page>
        <EtatContenu
          type="chargement"
          title="Chargement de votre compte"
          description="Ça ne prend que quelques secondes."
        />
      </Page>
    );
  }
  if (profile.isError) {
    return (
      <Page>
        <EtatContenu
          type="erreur"
          title="Impossible d’ouvrir votre compte"
          description={messageErreur(profile.error)}
          action={<Bouton onPress={() => profile.refetch()}>Réessayer</Bouton>}
        />
      </Page>
    );
  }
  if (!profile.data) {
    return (
      <Page>
        <EtatContenu
          type="vide"
          title="Profil introuvable"
          description="Reconnectez-vous avec votre numéro pour le retrouver."
        />
      </Page>
    );
  }

  const user = profile.data;
  const driver = user.role === "DRIVER";

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <EntetePage
          title="Mon compte"
          description="Vos infos, votre taxi et vos réglages."
        />

        <Carte style={styles.identity}>
          <View style={styles.largeAvatar}>
            <IconUser color={couleurs.primaire} size={30} />
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.name}>{user.name ?? "Profil à compléter"}</Text>
            <Text style={styles.role}>{driver ? "Chauffeur" : "Client"}</Text>
          </View>
          <View style={styles.verified}>
            <IconShieldCheck color={couleurs.succes} size={17} />
            <Text style={styles.verifiedText}>Vérifié</Text>
          </View>
        </Carte>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>VOS INFOS</Text>
          <Carte style={styles.list}>
            <LigneAction
              icon={<IconPhone color={couleurs.texte} size={20} />}
              title={formatTelephone(user.phone)}
              description="Le numéro avec lequel vous vous connectez"
              onPress={() => undefined}
            />
            {driver ? (
              <LigneAction
                icon={<IconCar color={couleurs.texte} size={20} />}
                title={user.vehicle ? (user.vehicle.model ?? "Votre véhicule") : "Véhicule à compléter"}
                description={
                  user.vehicle
                    ? `${user.vehicle.plate} · ${user.vehicle.seats} places`
                    : "Ajoutez la plaque et le modèle de votre taxi"
                }
                onPress={() => router.push("/profil")}
              />
            ) : null}
            <LigneAction
              icon={<IconEdit color={couleurs.texte} size={20} />}
              title="Modifier le profil"
              description="Nom affiché et véhicule"
              onPress={() => router.push("/profil")}
            />
          </Carte>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>RÉGLAGES</Text>
          <Carte style={styles.list}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <IconBell color={couleurs.texte} size={20} />
              </View>
              <View style={styles.identityCopy}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingDescription}>
                  Quand on vous répond ou qu’une course change
                </Text>
              </View>
              {notificationState.isPending ||
              toggleNotifications.isPending ? (
                <ActivityIndicator color={couleurs.texte} />
              ) : (
                <Switch
                  accessibilityLabel="Activer les notifications"
                  value={notificationState.data ?? false}
                  onValueChange={(value) =>
                    toggleNotifications.mutate(value)
                  }
                  trackColor={{
                    false: couleurs.desactive,
                    true: couleurs.primairePresse,
                  }}
                  thumbColor={
                    notificationState.data
                      ? couleurs.primaire
                      : couleurs.surface
                  }
                />
              )}
            </View>
          </Carte>
        </View>

        {notificationState.isError ? (
          <MessageEtat type="erreur">
            {messageErreur(notificationState.error)}
          </MessageEtat>
        ) : null}
        {toggleNotifications.isError ? (
          <MessageEtat type="erreur">
            {messageErreur(toggleNotifications.error)}
          </MessageEtat>
        ) : null}
        {signOut.isError ? (
          <MessageEtat type="erreur">
            {messageErreur(signOut.error)}
          </MessageEtat>
        ) : null}
        <Bouton
          variante="secondaire"
          icone={<IconLogout color={couleurs.erreur} size={19} />}
          chargement={signOut.isPending}
          onPress={() => signOut.mutate()}
        >
          Se déconnecter
        </Bouton>
      </ScrollView>
    </SafeAreaView>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.state}>
        <EntetePage
          title="Mon compte"
          description="Tout ce qui vous concerne."
        />
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: {
    padding: espacements.lg,
    paddingBottom: espacements.xxl,
    gap: espacements.lg,
  },
  state: { flex: 1, padding: espacements.lg, gap: espacements.lg },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
    padding: espacements.lg,
  },
  largeAvatar: {
    width: 56,
    height: 56,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.encre,
    alignItems: "center",
    justifyContent: "center",
  },
  identityCopy: { flex: 1, gap: 3 },
  name: { color: couleurs.texte, fontSize: 20, fontFamily: polices.titre },
  role: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    fontFamily: polices.texteDemiGras,
  },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: couleurs.succesClaire,
    borderRadius: rayons.rond,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  verifiedText: {
    color: couleurs.succes,
    fontSize: taillesTexte.micro,
    fontFamily: polices.texteGras,
  },
  group: { gap: espacements.sm },
  groupTitle: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    letterSpacing: 1,
    fontFamily: polices.texteGras,
  },
  list: { paddingHorizontal: espacements.md, paddingVertical: 0 },
  settingRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.surfaceSecondaire,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontFamily: polices.texteGras,
  },
  settingDescription: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    fontFamily: polices.texte,
  },
});
