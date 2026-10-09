import { IconCar, IconUser } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api, type Role } from "@/api";
import { AuthPage, Bouton, Carte, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { useAuthFlowStore } from "@/stores/auth-flow-store";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements } from "@/theme";

type ChoixRole = Extract<Role, "CLIENT" | "DRIVER">;

export default function ChoixDuRole() {
  const phone = useAuthFlowStore((state) => state.phone);
  const code = useAuthFlowStore((state) => state.code);
  const resetFlow = useAuthFlowStore((state) => state.reset);
  const [role, setRole] = useState<ChoixRole | null>(null);
  const saveSession = useAuthStore((state) => state.saveSession);
  const mutation = useMutation({
    mutationFn: async (selectedRole: ChoixRole) => {
      const session = await api.verifyOtp(phone, code, selectedRole);
      await saveSession(session);
    },
    onSuccess: () => {
      resetFlow();
      router.replace("/profil");
    },
  });

  if (!phone || !code) {
    return (
      <AuthPage
        icon={<IconUser color={couleurs.primaire} size={40} strokeWidth={1.8} />}
        title="Choisissez votre profil"
        description="La vérification précédente n’est plus disponible."
      >
        <MessageEtat>Recommencez la connexion pour choisir votre rôle.</MessageEtat>
        <Bouton onPress={() => router.replace("/connexion")}>Revenir à la connexion</Bouton>
      </AuthPage>
    );
  }

  return (
    <AuthPage
      icon={<IconUser color={couleurs.primaire} size={40} strokeWidth={1.8} />}
      title="Choisissez votre profil"
      description="Ce choix est demandé uniquement lors de votre première connexion."
    >
      <Carte style={styles.formulaire}>
        <View style={styles.choix}>
          <Bouton
            variante={role === "CLIENT" ? "primaire" : "secondaire"}
            icone={<IconUser color={role === "CLIENT" ? couleurs.surface : couleurs.primaire} size={20} />}
            onPress={() => setRole("CLIENT")}
          >Je suis client</Bouton>
          <Bouton
            variante={role === "DRIVER" ? "primaire" : "secondaire"}
            icone={<IconCar color={role === "DRIVER" ? couleurs.surface : couleurs.primaire} size={20} />}
            onPress={() => setRole("DRIVER")}
          >Je suis chauffeur</Bouton>
        </View>
        {!role ? <MessageEtat>Sélectionnez un rôle pour continuer.</MessageEtat> : null}
        {mutation.isError ? <MessageEtat type="erreur">{messageErreur(mutation.error)}</MessageEtat> : null}
        {mutation.isSuccess ? <MessageEtat type="succes">Profil créé.</MessageEtat> : null}
        <Bouton disabled={!role} chargement={mutation.isPending} onPress={() => role && mutation.mutate(role)}>Continuer</Bouton>
      </Carte>
    </AuthPage>
  );
}

const styles = StyleSheet.create({ formulaire: { gap: espacements.md }, choix: { gap: espacements.sm } });
