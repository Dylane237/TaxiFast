import { IconCurrentLocation, IconMapPin, IconSearch, IconX } from "@tabler/icons-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Corridor, Stop } from "@/api";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";
import { searchStops } from "./route-composer";

type PlaceSearchProps = {
  corridors: Corridor[];
  from: Stop | null;
  to: Stop | null;
  onFrom: (stop: Stop | null) => void;
  onTo: (stop: Stop | null) => void;
  onCurrentLocation?: () => void;
  locating?: boolean;
};

export function PlaceSearch({ corridors, from, to, onFrom, onTo, onCurrentLocation, locating }: PlaceSearchProps) {
  const [active, setActive] = useState<"from" | "to">("from");
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchStops(
    corridors,
    query,
    active === "to" && from ? from.corridorId : undefined,
  ).filter((stop) => stop.id !== (active === "from" ? to?.id : from?.id)), [active, corridors, from, query, to]);

  const choose = (stop: Stop) => {
    if (active === "from") {
      onFrom(stop);
      if (to?.corridorId !== stop.corridorId) onTo(null);
      setActive("to");
    } else {
      onTo(stop);
    }
    setQuery("");
  };

  return (
    <View style={styles.root}>
      <View style={styles.inputs}>
        <PlaceField label="Départ" value={from?.name ?? ""} active={active === "from"} onPress={() => { setActive("from"); setQuery(""); }} onClear={() => onFrom(null)} />
        <View style={styles.connector} />
        <PlaceField label="Destination" value={to?.name ?? ""} active={active === "to"} onPress={() => { setActive("to"); setQuery(""); }} onClear={() => onTo(null)} />
      </View>

      <View style={styles.searchBox}>
        <IconSearch color={couleurs.texteSecondaire} size={20} />
        <TextInput
          onChangeText={setQuery}
          onFocus={() => setQuery("")}
          placeholder={active === "from" ? "Rechercher le point de départ" : "Rechercher la destination"}
          placeholderTextColor={couleurs.texteSecondaire}
          style={styles.searchInput}
          value={query}
        />
      </View>

      {active === "from" && onCurrentLocation ? (
        <Pressable onPress={onCurrentLocation} disabled={locating} style={({ pressed }) => [styles.locationAction, pressed && styles.pressed]}>
          <View style={styles.resultIcon}><IconCurrentLocation color={couleurs.texte} size={20} /></View>
          <View style={styles.resultCopy}>
            <Text style={styles.resultName}>{locating ? "Localisation en cours…" : "Utiliser ma position"}</Text>
            <Text style={styles.resultDetail}>L’arrêt connu le plus proche sera sélectionné</Text>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.results}>
        {results.map((stop) => (
          <Pressable key={stop.id} onPress={() => choose(stop)} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
            <View style={styles.resultIcon}><IconMapPin color={couleurs.texte} size={19} /></View>
            <View style={styles.resultCopy}>
              <Text style={styles.resultName}>{stop.name}</Text>
              <Text numberOfLines={2} style={styles.resultDetail}>{stop.meetingInstructions ?? "Point de rencontre"}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PlaceField({ label, value, active, onPress, onClear }: { label: string; value: string; active: boolean; onPress: () => void; onClear: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.placeField, active && styles.placeFieldActive]}>
      <View style={[styles.dot, label === "Destination" && styles.dotEnd]} />
      <View style={styles.placeCopy}>
        <Text style={styles.placeLabel}>{label}</Text>
        <Text numberOfLines={2} style={[styles.placeValue, !value && styles.placePlaceholder]}>{value || "À définir"}</Text>
      </View>
      {value ? <Pressable accessibilityLabel={`Effacer ${label.toLowerCase()}`} hitSlop={10} onPress={onClear}><IconX color={couleurs.texteSecondaire} size={18} /></Pressable> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: espacements.md },
  inputs: { position: "relative", gap: espacements.sm },
  connector: { position: "absolute", left: 23, top: 44, width: 2, height: 42, backgroundColor: couleurs.bordure },
  placeField: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: espacements.md, paddingHorizontal: espacements.md, paddingVertical: espacements.sm, borderRadius: rayons.md, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.bordure },
  placeFieldActive: { borderColor: couleurs.primairePresse },
  dot: { width: 12, height: 12, borderRadius: rayons.rond, backgroundColor: couleurs.encre, zIndex: 1 },
  dotEnd: { backgroundColor: couleurs.primaire, borderColor: couleurs.encre, borderWidth: 2 },
  placeCopy: { flex: 1, gap: 2 },
  placeLabel: { color: couleurs.texteSecondaire, fontSize: taillesTexte.micro, fontWeight: "800" },
  placeValue: { color: couleurs.texte, fontSize: taillesTexte.normal, lineHeight: 20, fontWeight: "800" },
  placePlaceholder: { color: couleurs.texteSecondaire, fontWeight: "700" },
  searchBox: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: espacements.sm, paddingHorizontal: espacements.md, borderRadius: rayons.md, backgroundColor: couleurs.surfaceSecondaire },
  searchInput: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.petit, paddingVertical: espacements.md },
  results: { gap: espacements.xs },
  result: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: espacements.md, paddingVertical: 6 },
  locationAction: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: espacements.md, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: couleurs.bordure },
  resultIcon: { width: 36, height: 36, borderRadius: rayons.rond, backgroundColor: couleurs.surfaceSecondaire, alignItems: "center", justifyContent: "center" },
  resultCopy: { flex: 1, gap: 2 },
  resultName: { color: couleurs.texte, fontSize: taillesTexte.petit, fontWeight: "800" },
  resultDetail: { color: couleurs.texteSecondaire, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.72 },
});
