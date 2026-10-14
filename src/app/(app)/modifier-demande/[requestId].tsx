import { IconCheck, IconTrash } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import { Bouton, Carte, Champ, EntetePage, MessageEtat } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { couleurs, espacements } from "@/theme";

export default function EditRequestScreen() {
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const queryClient = useQueryClient();
  const requests = useQuery({ queryKey: ["client-requests"], queryFn: () => api.listClientTripRequests() });
  const request = requests.data?.find((item) => item.id === requestId);
  const [price, setPrice] = useState("");
  const displayedPrice = price || (request ? String(request.proposedPrice) : "");
  const update = useMutation({
    mutationFn: () => {
      const value = Number(displayedPrice);
      if (!Number.isInteger(value) || value < 100) throw new Error("Saisissez un prix entier valide en FCFA.");
      return api.updateTripRequest(requestId!, { proposedPrice: value });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-requests"] });
      router.back();
    },
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelTripRequest(requestId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-requests"] });
      router.replace("/mes-demandes");
    },
  });

  const confirmCancel = () => Alert.alert(
    "Annuler cette demande ?",
    "Les offres encore en attente seront annulées. Une réservation déjà confirmée doit être gérée séparément.",
    [
      { text: "Conserver", style: "cancel" },
      { text: "Annuler la demande", style: "destructive", onPress: () => cancel.mutate() },
    ],
  );

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <EntetePage title="Modifier la demande" description="Le nouveau prix remplacera votre proposition actuelle." />
        {requests.isPending ? <MessageEtat>Chargement de la demande…</MessageEtat> : null}
        {requests.isError ? <MessageEtat type="erreur">{messageErreur(requests.error)}</MessageEtat> : null}
        {!requests.isPending && !requests.isError && !request ? <MessageEtat type="erreur">Demande introuvable.</MessageEtat> : null}
        {request ? (
          <>
            <Carte>
              <Champ etiquette="Prix proposé (FCFA)" value={displayedPrice} onChangeText={setPrice} keyboardType="number-pad" />
            </Carte>
            {update.isError ? <MessageEtat type="erreur">{messageErreur(update.error)}</MessageEtat> : null}
            <Bouton icone={<IconCheck color={couleurs.texte} size={19} />} chargement={update.isPending} onPress={() => update.mutate()}>
              Enregistrer le prix
            </Bouton>
            {cancel.isError ? <MessageEtat type="erreur">{messageErreur(cancel.error)}</MessageEtat> : null}
            <Bouton variante="fantome" icone={<IconTrash color={couleurs.erreur} size={19} />} chargement={cancel.isPending} onPress={confirmCancel}>
              Annuler la demande
            </Bouton>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: { padding: espacements.lg, paddingBottom: espacements.xxl, gap: espacements.md },
});
