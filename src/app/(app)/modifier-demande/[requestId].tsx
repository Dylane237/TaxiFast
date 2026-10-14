import { IconCheck, IconInfoCircle, IconTrash } from "@tabler/icons-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api";
import { Bouton, Carte, Champ, EntetePage, MessageEtat, PuceChoix } from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { formatLocalDateTime, parseLocalDateTime } from "@/features/date-time-input";
import { couleurs, espacements, taillesTexte } from "@/theme";

export default function EditRequestScreen() {
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const queryClient = useQueryClient();
  const requests = useQuery({ queryKey: ["client-requests"], queryFn: () => api.listClientTripRequests() });
  const corridors = useQuery({ queryKey: ["corridors"], queryFn: () => api.listCorridors() });
  const request = requests.data?.find((item) => item.id === requestId);
  const [corridorOverride, setCorridorOverride] = useState<string | null>(null);
  const [fromOverride, setFromOverride] = useState<string | null>(null);
  const [toOverride, setToOverride] = useState<string | null>(null);
  const [startOverride, setStartOverride] = useState<string | null>(null);
  const [endOverride, setEndOverride] = useState<string | null>(null);
  const [priceOverride, setPriceOverride] = useState<string | null>(null);
  const corridorId = corridorOverride ?? request?.corridorId ?? "";
  const fromStopId = fromOverride ?? request?.fromStopId ?? "";
  const toStopId = toOverride ?? request?.toStopId ?? "";
  const windowStart = startOverride ?? (request ? formatLocalDateTime(request.windowStart) : "");
  const windowEnd = endOverride ?? (request ? formatLocalDateTime(request.windowEnd) : "");
  const price = priceOverride ?? (request ? String(request.proposedPrice) : "");
  const corridor = corridors.data?.find((item) => item.id === corridorId);
  const fromPosition = corridor?.stops.find((stop) => stop.id === fromStopId)?.position ?? -1;

  const update = useMutation({
    mutationFn: () => {
      const start = parseLocalDateTime(windowStart);
      const end = parseLocalDateTime(windowEnd);
      const value = Number(price);
      if (!corridor || !fromStopId || !toStopId || fromPosition >= (corridor.stops.find((stop) => stop.id === toStopId)?.position ?? -1)) {
        throw new Error("Choisissez une montée et une descente dans le bon ordre.");
      }
      if (!start || !end || new Date(start) <= new Date() || new Date(start) >= new Date(end)) {
        throw new Error("Saisissez une fenêtre future valide au format indiqué.");
      }
      if (!Number.isInteger(value) || value < 100) throw new Error("Saisissez un prix entier valide en FCFA.");
      return api.updateTripRequest(requestId!, {
        corridorId: corridor.id,
        fromStopId,
        toStopId,
        windowStart: start,
        windowEnd: end,
        proposedPrice: value,
      });
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
  const chooseCorridor = (id: string) => {
    setCorridorOverride(id);
    setFromOverride("");
    setToOverride("");
  };
  const confirmCancel = () => Alert.alert("Annuler cette demande ?", "Les offres encore en attente seront annulées.", [
    { text: "Conserver", style: "cancel" },
    { text: "Annuler la demande", style: "destructive", onPress: () => cancel.mutate() },
  ]);
  const pending = requests.isPending || corridors.isPending;
  const error = requests.error ?? corridors.error;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <EntetePage title="Modifier la demande" description="Itinéraire, arrêts, horaire et prix peuvent être ajustés." />
        {pending ? <MessageEtat>Chargement de la demande…</MessageEtat> : null}
        {error ? <MessageEtat type="erreur">{messageErreur(error)}</MessageEtat> : null}
        {!pending && !error && !request ? <MessageEtat type="erreur">Demande introuvable.</MessageEtat> : null}
        {request && corridor ? (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>ITINÉRAIRE</Text>
              <View style={styles.wrap}>{corridors.data?.map((item) => <PuceChoix key={item.id} label={item.name} selected={item.id === corridorId} onPress={() => chooseCorridor(item.id)} />)}</View>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>MONTÉE</Text>
              <View style={styles.wrap}>{corridor.stops.slice(0, -1).map((stop) => <PuceChoix key={stop.id} label={stop.name} selected={stop.id === fromStopId} onPress={() => { setFromOverride(stop.id); if (stop.position >= (corridor.stops.find((item) => item.id === toStopId)?.position ?? 0)) setToOverride(""); }} />)}</View>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>DESCENTE</Text>
              <View style={styles.wrap}>{corridor.stops.slice(1).map((stop) => <PuceChoix key={stop.id} label={stop.name} selected={stop.id === toStopId} disabled={fromPosition < 0 || stop.position <= fromPosition} onPress={() => setToOverride(stop.id)} />)}</View>
            </View>
            <Carte style={styles.form}>
              <Champ etiquette="Début (AAAA-MM-JJ HH:mm)" value={windowStart} onChangeText={setStartOverride} autoCapitalize="none" />
              <Champ etiquette="Fin (AAAA-MM-JJ HH:mm)" value={windowEnd} onChangeText={setEndOverride} autoCapitalize="none" />
              <Champ etiquette="Prix proposé (FCFA)" value={price} onChangeText={setPriceOverride} keyboardType="number-pad" />
            </Carte>
            <View style={styles.notice}><IconInfoCircle color={couleurs.texteSecondaire} size={18} /><Text style={styles.noticeText}>Modifier la demande annule les offres encore en attente. Une réservation confirmée bloque la modification.</Text></View>
            {update.isError ? <MessageEtat type="erreur">{messageErreur(update.error)}</MessageEtat> : null}
            <Bouton icone={<IconCheck color={couleurs.texte} size={19} />} chargement={update.isPending} onPress={() => update.mutate()}>Enregistrer les modifications</Bouton>
            {cancel.isError ? <MessageEtat type="erreur">{messageErreur(cancel.error)}</MessageEtat> : null}
            <Bouton variante="fantome" icone={<IconTrash color={couleurs.erreur} size={19} />} chargement={cancel.isPending} onPress={confirmCancel}>Annuler la demande</Bouton>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: { padding: espacements.lg, paddingBottom: espacements.xxl, gap: espacements.lg },
  section: { gap: espacements.sm },
  label: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontWeight: "900", letterSpacing: 1.1 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: espacements.sm },
  form: { gap: espacements.md },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: espacements.sm },
  noticeText: { flex: 1, color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, lineHeight: 20 },
});
