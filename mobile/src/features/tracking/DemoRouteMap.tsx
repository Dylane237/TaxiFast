import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { couleurs, espacements, rayons, taillesTexte } from "@/theme";

type DemoRouteMapProps = {
  stopCount: number;
};

const routePoints = [
  { x: 112, y: 690 },
  { x: 184, y: 574 },
  { x: 310, y: 504 },
  { x: 428, y: 390 },
  { x: 594, y: 278 },
];

export function DemoRouteMap({ stopCount }: DemoRouteMapProps) {
  const markers = routePoints.slice(0, Math.min(Math.max(stopCount, 2), routePoints.length));

  return (
    <View style={styles.container}>
      <Svg height="100%" viewBox="0 0 720 900" width="100%">
        <Path d="M-60 170 C130 92 246 228 404 164 C526 114 616 18 778 38" fill="none" stroke="#E2E4DD" strokeWidth="32" />
        <Path d="M18 802 C174 720 128 602 280 536 C424 474 424 350 740 190" fill="none" stroke="#E7E8E2" strokeWidth="58" />
        <Path d="M-30 420 C126 368 200 422 326 342 C462 256 594 246 758 316" fill="none" stroke="#E2E4DD" strokeWidth="22" />
        <Path d="M598 936 C570 724 478 686 542 500 C590 360 670 292 754 240" fill="none" stroke="#EBECE7" strokeWidth="38" />
        <Path d="M112 690 C184 574 310 504 428 390 C496 324 542 300 594 278" fill="none" stroke={couleurs.surface} strokeLinecap="round" strokeWidth="15" />
        <Path d="M112 690 C184 574 310 504 428 390 C496 324 542 300 594 278" fill="none" stroke={couleurs.encre} strokeLinecap="round" strokeWidth="8" />
        {markers.map((point, index) => (
          <Circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            fill={index === markers.length - 1 ? couleurs.primaire : couleurs.surface}
            r={index === 0 || index === markers.length - 1 ? 14 : 9}
            stroke={couleurs.encre}
            strokeWidth={5}
          />
        ))}
      </Svg>
      <View style={styles.demoBadge}>
        <Text style={styles.demoBadgeText}>CARTE DE DÉMONSTRATION</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    inset: 0,
    backgroundColor: couleurs.fond,
  },
  demoBadge: {
    position: "absolute",
    left: espacements.lg,
    top: 104,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface,
    borderColor: couleurs.bordure,
    borderWidth: 1,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
  },
  demoBadgeText: {
    color: couleurs.texteSecondaire,
    fontSize: taillesTexte.micro,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
});
