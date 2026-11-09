import { IconArrowRight, IconBrandGoogleFilled } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "@/api";
import { AuthPage, Bouton, Champ, MessageEtat } from "@/components";
import { normaliserTelephone } from "@/features/auth/auth-validation";
import { connexionGoogle, googleDisponible } from "@/features/auth/google";
import { useFinConnexion } from "@/features/auth/useFinConnexion";
import { messageErreur } from "@/features/auth/message-erreur";
import { useAuthFlowStore } from "@/stores/auth-flow-store";
import { couleurs, espacements, polices, taillesTexte } from "@/theme";

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

  const setGoogle = useAuthFlowStore((state) => state.setGoogle);
  const finConnexion = useFinConnexion();
  const google = useMutation({
    mutationFn: async () => {
      const jeton = await connexionGoogle();
      if (!jeton) return null; // la personne a fermé le choix du compte
      try {
        return { session: await api.signInWithGoogle({ idToken: jeton.idToken }), jeton };
      } catch (error) {
        // Première fois : on garde le jeton et on demande le rôle et le numéro.
        if (error instanceof ApiError && error.code === "SIGNUP_REQUIRED") return { session: null, jeton };
        throw error;
      }
    },
    onSuccess: async (resultat) => {
      if (!resultat) return;
      if (resultat.session) return finConnexion(resultat.session);
      setGoogle(resultat.jeton.idToken, resultat.jeton.prenom);
      router.push("/google");
    },
  });

  const envoyer = () => {
    const phone = normaliserTelephone(telephone);
    if (!phone) {
      setErreurSaisie("Il faut un numéro mobile camerounais : 9 chiffres, en commençant par 6.");
      return;
    }
    setErreurSaisie(null);
    mutation.mutate(phone);
  };

  return (
    <AuthPage
      title="Votre taxi, sans attendre au bord de la route."
      description="Entrez votre numéro pour trouver une place ou publier votre trajet."
    >
      <View style={styles.formulaire}>
        <Champ
          etiquette="Numéro de téléphone"
          prefixe="+237"
          value={telephone}
          onChangeText={setTelephone}
          placeholder="6XX XXX XXX"
          aide="On vous envoie un code par SMS pour vérifier que c’est bien vous."
          keyboardType="phone-pad"
          autoComplete="tel"
          erreur={erreurSaisie ?? undefined}
          onSubmitEditing={envoyer}
          returnKeyType="send"
        />
        {mutation.isError ? <MessageEtat type="erreur">{messageErreur(mutation.error)}</MessageEtat> : null}
        {mutation.isSuccess ? <MessageEtat type="succes">Code envoyé, regardez vos SMS.</MessageEtat> : null}
        <Bouton
          icone={<IconArrowRight color={couleurs.texte} size={19} />}
          chargement={mutation.isPending}
          onPress={envoyer}
        >
          Continuer
        </Bouton>
        {googleDisponible ? (
          <>
            <View style={styles.separateur}>
              <View style={styles.trait} />
              <Text style={styles.ou}>ou</Text>
              <View style={styles.trait} />
            </View>
            {google.isError ? <MessageEtat type="erreur">{messageErreur(google.error)}</MessageEtat> : null}
            <Bouton
              variante="secondaire"
              icone={<IconBrandGoogleFilled color={couleurs.texte} size={18} />}
              chargement={google.isPending}
              onPress={() => google.mutate()}
            >
              Continuer avec Google
            </Bouton>
          </>
        ) : null}
      </View>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  formulaire: { gap: espacements.md },
  separateur: { flexDirection: "row", alignItems: "center", gap: espacements.sm },
  trait: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: couleurs.bordure },
  ou: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontFamily: polices.texteDemiGras },
});
