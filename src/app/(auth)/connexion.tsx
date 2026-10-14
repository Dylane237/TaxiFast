import { IconArrowRight, IconPhone } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api } from "@/api";
import { AuthPage, Bouton, Champ, MessageEtat } from "@/components";
import { normaliserTelephone } from "@/features/auth/auth-validation";
import { messageErreur } from "@/features/auth/message-erreur";
import { useAuthFlowStore } from "@/stores/auth-flow-store";
import { couleurs, espacements } from "@/theme";

export default function Connexion() {
  const [telephone, setTelephone] = useState("");
  const [erreurSaisie, setErreurSaisie] = useState<string | null>(null);
  const setPhone = useAuthFlowStore((state) => state.setPhone);
  const mutation = useMutation({
    mutationFn: (phone: string) => api.requestOtp(phone),
    onSuccess: (_, phone) => {
      setPhone(phone);
      router.push("/code");
    },
  });

  const envoyer = () => {
    const phone = normaliserTelephone(telephone);
    if (!phone) {
      setErreurSaisie("Saisissez un numéro camerounais valide commençant par 6.");
      return;
    }
    setErreurSaisie(null);
    mutation.mutate(phone);
  };

  return (
    <AuthPage
      icon={<IconPhone color={couleurs.primaire} size={25} strokeWidth={2} />}
      title="Bougez simplement."
      description="Connectez-vous avec votre numéro camerounais pour trouver ou publier un trajet."
    >
      <View style={styles.formulaire}>
        <Champ
          etiquette="Numéro de téléphone"
          prefixe="+237"
          value={telephone}
          onChangeText={setTelephone}
          placeholder="6XX XXX XXX"
          aide="Un code de vérification vous sera envoyé."
          keyboardType="phone-pad"
          autoComplete="tel"
          erreur={erreurSaisie ?? undefined}
          onSubmitEditing={envoyer}
          returnKeyType="send"
        />
        {mutation.isError ? <MessageEtat type="erreur">{messageErreur(mutation.error)}</MessageEtat> : null}
        {mutation.isSuccess ? <MessageEtat type="succes">Code envoyé.</MessageEtat> : null}
        <Bouton
          icone={<IconArrowRight color={couleurs.texte} size={19} />}
          chargement={mutation.isPending}
          onPress={envoyer}
        >
          Continuer
        </Bouton>
      </View>
    </AuthPage>
  );
}

const styles = StyleSheet.create({ formulaire: { gap: espacements.md } });
