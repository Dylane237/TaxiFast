import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { Stop } from "@/api";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

export function RouteMiniMap({ stops, compact = false }: { stops: Stop[]; compact?: boolean }) {
  const points = stops.map((_, index) => ({
    x: 48 + (index / Math.max(1, stops.length - 1)) * 264,
    y: 132 - Math.sin((index / Math.max(1, stops.length - 1)) * Math.PI) * 68,
  }));
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");
  return (
    <View style={[styles.root, compact && styles.compact]}>
      <Svg height="100%" viewBox="0 0 360 170" width="100%">
        <Path d="M-20 48 C76 14 136 84 220 40 C282 8 330 24 390 2" fill="none" stroke="#E1E3DD" strokeWidth="20" />
        <Path d="M-18 160 C84 102 136 146 214 106 C292 66 330 52 390 80" fill="none" stroke="#E7E8E2" strokeWidth="30" />
        {points.length > 1 ? <Path d={path} fill="none" stroke={couleurs.surface} strokeLinecap="round" strokeLinejoin="round" strokeWidth="13" /> : null}
        {points.length > 1 ? <Path d={path} fill="none" stroke={couleurs.encre} strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" /> : null}
        {points.map((point, index) => (
          <Circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r={index === 0 || index === points.length - 1 ? 10 : 7} fill={index === points.length - 1 ? couleurs.primaire : couleurs.surface} stroke={couleurs.encre} strokeWidth="4" />
        ))}
      </Svg>
      {stops.length ? (
        <View style={styles.caption}>
          <Text numberOfLines={1} style={styles.captionText}>{stops[0]!.name}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text numberOfLines={1} style={[styles.captionText, styles.end]}>{stops.at(-1)!.name}</Text>
        </View>
      ) : <Text style={styles.placeholder}>Votre itinéraire apparaîtra ici</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: 184, borderRadius: rayons.lg, backgroundColor: couleurs.surfaceSecondaire, overflow: "hidden", borderWidth: 1, borderColor: couleurs.bordure },
  compact: { height: 146 },
  caption: { position: "absolute", left: espacements.md, right: espacements.md, bottom: espacements.md, flexDirection: "row", alignItems: "center", gap: espacements.sm, borderRadius: rayons.rond, backgroundColor: couleurs.surface, paddingHorizontal: espacements.md, paddingVertical: espacements.sm },
  captionText: { flex: 1, color: couleurs.texte, fontSize: taillesTexte.micro, fontWeight: "800" },
  end: { textAlign: "right" },
  arrow: { color: couleurs.texteSecondaire, fontWeight: "900" },
  placeholder: { position: "absolute", alignSelf: "center", top: 64, color: couleurs.texteSecondaire, fontSize: taillesTexte.petit, fontWeight: "700" },
});
