import { IconCar, IconUser } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api, type Role } from "@/api";
import { AuthPage, Bouton, CarteRole, Champ, MessageEtat } from "@/components";
import { normaliserTelephone } from "@/features/auth/auth-validation";
import { messageErreur } from "@/features/auth/message-erreur";
import { useFinConnexion } from "@/features/auth/useFinConnexion";
import { useAuthFlowStore } from "@/stores/auth-flow-store";
import { espacements, couleurs } from "@/theme";

type ChoixRole = Extract<Role, "CLIENT" | "DRIVER">;

/** Première connexion avec Google : le rôle, le prénom et le numéro (pour que chauffeur et client s'appellent). */
export default function InscriptionGoogle() {
  const idToken = useAuthFlowStore((state) => state.googleToken);
  const prenomGoogle = useAuthFlowStore((state) => state.googlePrenom);
  const finConnexion = useFinConnexion();
  const [role, setRole] = useState<ChoixRole | null>(null);
  const [prenom, setPrenom] = useState(prenomGoogle);
  const [telephone, setTelephone] = useState("");
  const [erreurSaisie, setErreurSaisie] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (entree: { role: ChoixRole; phone: string; name?: string }) => api.signInWithGoogle({ idToken, ...entree }),
    onSuccess: finConnexion,
  });

  if (!idToken) {
    return (
      <AuthPage title="On reprend depuis le début" description="La connexion avec Google a expiré.">
        <Bouton onPress={() => router.replace("/connexion")}>Revenir à la connexion</Bouton>
      </AuthPage>
    );
  }

  const valider = () => {
    const phone = normaliserTelephone(telephone);
    if (!role) return setErreurSaisie("Choisissez d’abord : client ou chauffeur.");
    if (!phone) return setErreurSaisie("Il faut un numéro mobile camerounais : 9 chiffres, en commençant par 6.");
    setErreurSaisie(null);
    mutation.mutate({ role, phone, name: prenom.trim() || undefined });
  };

  return (
    <AuthPage title="Bienvenue sur Taxi Fast" description="Encore deux infos, et c’est parti.">
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
        <Champ etiquette="Prénom" value={prenom} onChangeText={setPrenom} placeholder="Ex. Christelle" autoComplete="given-name" />
        <Champ
          etiquette="Numéro de téléphone"
          prefixe="+237"
          value={telephone}
          onChangeText={setTelephone}
          placeholder="6XX XXX XXX"
          aide="Pour que le chauffeur et le client puissent s’appeler."
          keyboardType="phone-pad"
          autoComplete="tel"
          onSubmitEditing={valider}
          returnKeyType="done"
        />
        {erreurSaisie ? <MessageEtat type="erreur">{erreurSaisie}</MessageEtat> : null}
        {mutation.isError ? <MessageEtat type="erreur">{messageErreur(mutation.error)}</MessageEtat> : null}
        <Bouton chargement={mutation.isPending} onPress={valider}>Créer mon compte</Bouton>
      </View>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  formulaire: { gap: espacements.md },
  choix: { gap: espacements.sm },
});
