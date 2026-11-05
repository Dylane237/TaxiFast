import { IconArrowLeft, IconKey } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api, ApiError, configApi } from "@/api";
import { AuthPage, Bouton, Champ, MessageEtat } from "@/components";
import { codeOtpValide } from "@/features/auth/auth-validation";
import { messageErreur } from "@/features/auth/message-erreur";
import { useAuthFlowStore } from "@/stores/auth-flow-store";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements, polices } from "@/theme";
import { formatTelephone } from "@/features/format";

export default function CodeOtp() {
  const otpLength = configApi.modeDemo ? 4 : 6;
  const phone = useAuthFlowStore((state) => state.phone);
  const setFlowCode = useAuthFlowStore((state) => state.setCode);
  const resetFlow = useAuthFlowStore((state) => state.reset);
  const [code, setCode] = useState("");
  const [erreurSaisie, setErreurSaisie] = useState<string | null>(null);
  const saveSession = useAuthStore((state) => state.saveSession);
  const updateUser = useAuthStore((state) => state.updateUser);
  const mutation = useMutation({
    mutationFn: async () => {
      const session = await api.verifyOtp(phone, code);
      const profile = await api.getCurrentUser();
      return { session, profile };
    },
    onSuccess: async ({ session, profile }) => {
      await saveSession(session);
      if (profile) await updateUser(profile);
      const complet = Boolean(
        profile?.name && (profile.role !== "DRIVER" || profile.vehicle),
      );
      resetFlow();
      router.replace(complet ? "/accueil" : "/profil");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "ROLE_REQUIRED") {
        setFlowCode(code);
        router.push("/role");
      }
    },
  });

  const verifier = () => {
    if (!phone) {
      router.replace("/connexion");
      return;
    }
    if (!codeOtpValide(code, otpLength)) {
      setErreurSaisie(`Le code compte ${otpLength} chiffres, il en manque.`);
      return;
    }
    setErreurSaisie(null);
    mutation.mutate();
  };

  const roleRequis =
    mutation.error instanceof ApiError &&
    mutation.error.code === "ROLE_REQUIRED";
  return (
    <AuthPage
      icon={<IconKey color={couleurs.primaire} size={25} strokeWidth={2} />}
      title="Entrez le code reçu par SMS."
      description={`Envoyé au ${phone ? formatTelephone(phone) : "numéro que vous avez donné"}. Il arrive en général en moins d’une minute.`}
    >
      <View style={styles.formulaire}>
        <Champ
          etiquette="Code reçu"
          value={code}
          onChangeText={(value) =>
            setCode(value.replace(/\D/g, "").slice(0, otpLength))
          }
          placeholder={"•".repeat(otpLength)}
          aide={otpLength === 4 ? "Mode démo : tapez 1234." : "Le code reste valable quelques minutes."}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          erreur={erreurSaisie ?? undefined}
          onSubmitEditing={verifier}
          style={styles.code}
        />
        {mutation.isError && !roleRequis ? (
          <MessageEtat type="erreur">
            {messageErreur(mutation.error)}
          </MessageEtat>
        ) : null}
        {mutation.isSuccess ? (
          <MessageEtat type="succes">C’est bon, votre numéro est vérifié.</MessageEtat>
        ) : null}
        <Bouton chargement={mutation.isPending} onPress={verifier}>
          Vérifier le code
        </Bouton>
        <Bouton
          variante="fantome"
          icone={<IconArrowLeft color={couleurs.texte} size={19} />}
          onPress={() => router.replace("/connexion")}
        >
          Changer de numéro
        </Bouton>
      </View>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  formulaire: { gap: espacements.md },
  code: { textAlign: "center", letterSpacing: 10, fontSize: 22, fontFamily: polices.titre },
});
