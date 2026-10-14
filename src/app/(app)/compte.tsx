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
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

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
          title="Chargement du compte"
          description="Nous récupérons vos informations."
        />
      </Page>
    );
  }
  if (profile.isError) {
    return (
      <Page>
        <EtatContenu
          type="erreur"
          title="Compte indisponible"
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
          title="Aucun profil"
          description="Reconnectez-vous pour retrouver votre compte."
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
          description="Profil, véhicule et préférences de l’application."
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
          <Text style={styles.groupTitle}>INFORMATIONS</Text>
          <Carte style={styles.list}>
            <LigneAction
              icon={<IconPhone color={couleurs.texte} size={20} />}
              title={user.phone}
              description="Numéro de connexion vérifié"
              onPress={() => undefined}
            />
            {driver ? (
              <LigneAction
                icon={<IconCar color={couleurs.texte} size={20} />}
                title={user.vehicle?.model ?? "Véhicule à compléter"}
                description={
                  user.vehicle
                    ? `${user.vehicle.plate} · ${user.vehicle.seats} places`
                    : "Ajoutez les informations du véhicule"
                }
                onPress={() => router.push("/profil")}
              />
            ) : null}
            <LigneAction
              icon={<IconEdit color={couleurs.texte} size={20} />}
              title="Modifier le profil"
              description="Nom et informations personnelles"
              onPress={() => router.push("/profil")}
            />
          </Carte>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>PRÉFÉRENCES</Text>
          <Carte style={styles.list}>
            <LigneAction
              icon={<IconBell color={couleurs.texte} size={20} />}
              title="Notifications"
              description="Offres, réservations et changements"
              badge="Bientôt"
              onPress={() => undefined}
            />
          </Carte>
        </View>

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
          description="Vos informations et préférences."
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
  name: { color: couleurs.texte, fontSize: 20, fontWeight: "900" },
  role: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.petit,
    fontWeight: "700",
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
    fontWeight: "900",
  },
  group: { gap: espacements.sm },
  groupTitle: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
    letterSpacing: 1,
  },
  list: { paddingHorizontal: espacements.md, paddingVertical: 0 },
});
