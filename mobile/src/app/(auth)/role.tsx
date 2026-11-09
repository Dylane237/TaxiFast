import { IconCar, IconUser } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api, type Role } from "@/api";
import { AuthPage, Bouton, CarteRole, MessageEtat } from "@/components";
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
        title="On reprend depuis le début"
        description="La vérification de votre numéro a expiré."
      >
        <MessageEtat>Entrez de nouveau votre numéro pour continuer.</MessageEtat>
        <Bouton onPress={() => router.replace("/connexion")}>Revenir à la connexion</Bouton>
      </AuthPage>
    );
  }

  return (
    <AuthPage
      title="Vous êtes client ou chauffeur ?"
      description="Choisissez bien : ce choix se fait une seule fois, à la création du compte."
    >
      <View style={styles.formulaire}>
        <View style={styles.choix}>
          <CarteRole
            selected={role === "CLIENT"}
            icon={<IconUser color={couleurs.texte} size={24} />}
            title="Client"
            description="Je cherche une place dans un taxi qui passe par mon chemin."
            onPress={() => setRole("CLIENT")}
          />
          <CarteRole
            selected={role === "DRIVER"}
            icon={<IconCar color={couleurs.texte} size={24} />}
            title="Chauffeur"
            description="Je publie mes trajets et je prends des clients en route."
            onPress={() => setRole("DRIVER")}
          />
        </View>
        {mutation.isError ? <MessageEtat type="erreur">{messageErreur(mutation.error)}</MessageEtat> : null}
        {mutation.isSuccess ? <MessageEtat type="succes">Compte créé, bienvenue !</MessageEtat> : null}
        <Bouton disabled={!role} chargement={mutation.isPending} onPress={() => role && mutation.mutate(role)}>Continuer</Bouton>
      </View>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  formulaire: { gap: espacements.md },
  choix: { gap: espacements.sm },
});
