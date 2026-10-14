import { IconCar, IconCheck, IconUser } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, type Role } from "@/api";
import { AuthPage, Bouton, MessageEtat } from "@/components";
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
        icon={<IconUser color={couleurs.primaire} size={25} strokeWidth={2} />}
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
      icon={<IconUser color={couleurs.primaire} size={25} strokeWidth={2} />}
      title="Comment voyagez-vous ?"
      description="Choisissez votre usage principal. Ce choix est demandé uniquement à la création du compte."
    >
      <View style={styles.formulaire}>
        <View style={styles.choix}>
          <RoleCard
            selected={role === "CLIENT"}
            icon={<IconUser color={couleurs.texte} size={24} />}
            title="Client"
            description="Je cherche une place sur un itinéraire."
            onPress={() => setRole("CLIENT")}
          />
          <RoleCard
            selected={role === "DRIVER"}
            icon={<IconCar color={couleurs.texte} size={24} />}
            title="Chauffeur"
            description="Je publie mes trajets et accepte des clients."
            onPress={() => setRole("DRIVER")}
          />
        </View>
        {mutation.isError ? <MessageEtat type="erreur">{messageErreur(mutation.error)}</MessageEtat> : null}
        {mutation.isSuccess ? <MessageEtat type="succes">Profil créé.</MessageEtat> : null}
        <Bouton disabled={!role} chargement={mutation.isPending} onPress={() => role && mutation.mutate(role)}>Continuer</Bouton>
      </View>
    </AuthPage>
  );
}

function RoleCard({
  selected,
  icon,
  title,
  description,
  onPress,
}: {
  selected: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.roleCard, selected && styles.roleCardSelected, pressed && styles.roleCardPressed]}
      onPress={onPress}
    >
      <View style={[styles.roleIcon, selected && styles.roleIconSelected]}>{icon}</View>
      <View style={styles.roleCopy}>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleDescription}>{description}</Text>
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected ? <IconCheck color={couleurs.encre} size={15} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  formulaire: { gap: espacements.md },
  choix: { gap: espacements.sm },
  roleCard: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.md,
    padding: espacements.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },
  roleCardSelected: { borderColor: couleurs.encre, backgroundColor: couleurs.primaireClaire },
  roleCardPressed: { opacity: 0.82 },
  roleIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: couleurs.surface, alignItems: "center", justifyContent: "center" },
  roleIconSelected: { backgroundColor: couleurs.primaire },
  roleCopy: { flex: 1, gap: 3 },
  roleTitle: { color: couleurs.texte, fontSize: 16, fontWeight: "900" },
  roleDescription: { color: couleurs.texteSecondaire, fontSize: 13, lineHeight: 18 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: couleurs.bordure, alignItems: "center", justifyContent: "center" },
  checkSelected: { backgroundColor: couleurs.primaire, borderColor: couleurs.primairePresse },
});
