import {
  IconClock,
  IconMapPin,
  IconRoute,
  IconWallet,
} from "@tabler/icons-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Corridor } from "@/api";
import {
  Bouton,
  Champ,
  EntetePage,
  EtatContenu,
  MessageEtat,
  PuceChoix,
} from "@/components";
import { messageErreur } from "@/features/auth/message-erreur";
import { parseClientRequestForm } from "@/features/client-request/client-request";
import { couleurs, espacements, taillesTexte } from "@/theme";

const starts = [
  { label: "Maintenant", value: 0 },
  { label: "+30 min", value: 30 },
  { label: "+1 h", value: 60 },
];
const durations = [
  { label: "30 min", value: 30 },
  { label: "1 heure", value: 60 },
  { label: "2 heures", value: 120 },
];

function StopChoices({
  corridor,
  fromId,
  toId,
  onFrom,
  onTo,
}: {
  corridor: Corridor;
  fromId: string;
  toId: string;
  onFrom: (id: string) => void;
  onTo: (id: string) => void;
}) {
  const fromPosition =
    corridor.stops.find((stop) => stop.id === fromId)?.position ?? -1;
  return (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Montée</Text>
        <View style={styles.wrap}>
          {corridor.stops.slice(0, -1).map((stop) => (
            <PuceChoix
              key={stop.id}
              label={stop.name}
              selected={fromId === stop.id}
              onPress={() => {
                onFrom(stop.id);
                if (
                  toId &&
                  stop.position >=
                    (corridor.stops.find((item) => item.id === toId)
                      ?.position ?? 0)
                )
                  onTo("");
              }}
            />
          ))}
        </View>
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Descente</Text>
        <View style={styles.wrap}>
          {corridor.stops.slice(1).map((stop) => (
            <PuceChoix
              key={stop.id}
              label={stop.name}
              selected={toId === stop.id}
              disabled={fromPosition < 0 || stop.position <= fromPosition}
              onPress={() => onTo(stop.id)}
            />
          ))}
        </View>
      </View>
    </>
  );
}

export default function RechercheScreen() {
  const corridorsQuery = useQuery({
    queryKey: ["corridors"],
    queryFn: () => api.listCorridors(),
  });
  const [corridorId, setCorridorId] = useState("");
  const [fromStopId, setFromStopId] = useState("");
  const [toStopId, setToStopId] = useState("");
  const [price, setPrice] = useState("1500");
  const [startMinutes, setStartMinutes] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [validationError, setValidationError] = useState<string | null>(null);
  const corridor = useMemo(
    () => corridorsQuery.data?.find((item) => item.id === corridorId),
    [corridorId, corridorsQuery.data],
  );
  const mutation = useMutation({
    mutationFn: api.createTripRequest,
    onSuccess: (request) =>
      router.replace({
        pathname: "/demande/[requestId]",
        params: { requestId: request.id },
      }),
  });

  const submit = () => {
    if (!corridor) {
      setValidationError("Choisissez d’abord un axe.");
      return;
    }
    const parsed = parseClientRequestForm({
      corridorId,
      fromStopId,
      toStopId,
      price,
      startMinutes,
      durationMinutes,
    });
    if (!parsed.success) {
      setValidationError(parsed.message);
      return;
    }
    const from = corridor.stops.find((stop) => stop.id === fromStopId);
    const to = corridor.stops.find((stop) => stop.id === toStopId);
    if (!from || !to || from.position >= to.position) {
      setValidationError("La descente doit se trouver après la montée.");
      return;
    }
    setValidationError(null);
    mutation.mutate({
      corridorId,
      fromStopId,
      toStopId,
      proposedPrice: parsed.data.price,
      windowStart: parsed.data.windowStart,
      windowEnd: parsed.data.windowEnd,
    });
  };

  if (corridorsQuery.isPending)
    return (
      <State>
        <EtatContenu
          type="chargement"
          title="Chargement des axes"
          description="Nous préparons les arrêts disponibles."
        />
      </State>
    );
  if (corridorsQuery.isError)
    return (
      <State>
        <EtatContenu
          type="erreur"
          title="Axes indisponibles"
          description={messageErreur(corridorsQuery.error)}
          action={
            <Bouton onPress={() => void corridorsQuery.refetch()}>
              Réessayer
            </Bouton>
          }
        />
      </State>
    );
  if (!corridorsQuery.data.length)
    return (
      <State>
        <EtatContenu
          type="vide"
          title="Aucun axe disponible"
          description="Revenez lorsque des axes auront été publiés."
        />
      </State>
    );

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <EntetePage
          title="Où allez-vous ?"
          description="Composez votre trajet, puis proposez un prix au chauffeur."
        />
        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeading}>
            <IconRoute color={couleurs.texteSecondaire} size={18} />
            <Text style={styles.fieldLabel}>Axe</Text>
          </View>
          <View style={styles.wrap}>
            {corridorsQuery.data.map((item) => (
              <PuceChoix
                key={item.id}
                label={item.name}
                selected={item.id === corridorId}
                onPress={() => {
                  setCorridorId(item.id);
                  setFromStopId("");
                  setToStopId("");
                }}
              />
            ))}
          </View>
        </View>
        {corridor ? (
          <StopChoices
            corridor={corridor}
            fromId={fromStopId}
            toId={toStopId}
            onFrom={setFromStopId}
            onTo={setToStopId}
          />
        ) : null}
        <View style={styles.divider} />
        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeading}>
            <IconClock color={couleurs.texteSecondaire} size={18} />
            <Text style={styles.fieldLabel}>Départ souhaité</Text>
          </View>
          <View style={styles.wrap}>
            {starts.map((item) => (
              <PuceChoix
                key={item.value}
                label={item.label}
                selected={startMinutes === item.value}
                onPress={() => setStartMinutes(item.value)}
              />
            ))}
          </View>
          <Text style={styles.helper}>Fenêtre de disponibilité</Text>
          <View style={styles.wrap}>
            {durations.map((item) => (
              <PuceChoix
                key={item.value}
                label={item.label}
                selected={durationMinutes === item.value}
                onPress={() => setDurationMinutes(item.value)}
              />
            ))}
          </View>
        </View>
        <View style={styles.priceRow}>
          <IconWallet color={couleurs.texteSecondaire} size={20} />
          <View style={styles.priceField}>
            <Champ
              etiquette="Prix proposé (FCFA)"
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              placeholder="1 500"
            />
          </View>
        </View>
        {validationError ? (
          <MessageEtat type="erreur">{validationError}</MessageEtat>
        ) : null}
        {mutation.isError ? (
          <MessageEtat type="erreur">
            {messageErreur(mutation.error)}
          </MessageEtat>
        ) : null}
        <Bouton
          icone={<IconMapPin color={couleurs.texte} size={19} />}
          chargement={mutation.isPending}
          onPress={submit}
        >
          Envoyer ma demande
        </Bouton>
      </ScrollView>
    </SafeAreaView>
  );
}

function State({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.state}>
        <EntetePage
          title="Où allez-vous ?"
          description="Recherche d’un trajet sur un axe."
        />
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  content: {
    padding: espacements.lg,
    paddingBottom: espacements.xxl,
    gap: espacements.lg,
  },
  state: { flex: 1, padding: espacements.lg },
  fieldGroup: { gap: espacements.sm },
  fieldHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacements.sm,
  },
  fieldLabel: {
    color: couleurs.texte,
    fontSize: taillesTexte.normal,
    fontWeight: "900",
  },
  helper: { color: couleurs.texteSecondaire, fontSize: taillesTexte.petit },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: espacements.sm },
  divider: { height: 1, backgroundColor: couleurs.bordure },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: espacements.md,
  },
  priceField: { flex: 1 },
});
