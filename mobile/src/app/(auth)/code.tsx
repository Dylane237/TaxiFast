import { IconArrowLeft, IconKey } from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api, ApiError } from "@/api";
import { AuthPage, Bouton, Champ, MessageEtat } from "@/components";
import { codeOtpValide } from "@/features/auth/auth-validation";
import { messageErreur } from "@/features/auth/message-erreur";
import { useAuthFlowStore } from "@/stores/auth-flow-store";
import { useAuthStore } from "@/stores/auth-store";
import { couleurs, espacements } from "@/theme";

export default function CodeOtp() {
  const otpLength = process.env.EXPO_PUBLIC_USE_MOCK === "false" ? 6 : 4;
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
      setErreurSaisie(`Le code doit contenir ${otpLength} chiffres.`);
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
      title="Vérifiez votre numéro."
      description={`Code envoyé au ${phone || "numéro indiqué"}.`}
    >
      <View style={styles.formulaire}>
        <Champ
          etiquette="Code OTP"
          value={code}
          onChangeText={(value) =>
            setCode(value.replace(/\D/g, "").slice(0, otpLength))
          }
          placeholder={otpLength === 4 ? "1234" : "123456"}
          aide={otpLength === 4 ? "Mode fictif : saisissez 1234." : "Le code expire après quelques minutes."}
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
          <MessageEtat type="succes">Numéro vérifié.</MessageEtat>
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
  code: { textAlign: "center", letterSpacing: 10, fontSize: 22, fontWeight: "800" },
});
