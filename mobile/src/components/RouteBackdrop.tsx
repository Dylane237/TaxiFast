import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { couleurs } from "@/theme";

export function RouteBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height="100%" width="100%" viewBox="0 0 390 840" preserveAspectRatio="xMidYMid slice">
        <Path d="M-30 160 C80 110 92 240 205 205 S330 85 430 140" fill="none" stroke="#30332E" strokeWidth="34" />
        <Path d="M-25 480 C80 420 130 535 225 478 S340 370 430 430" fill="none" stroke="#292C28" strokeWidth="46" />
        <Path d="M65 0 C42 145 170 220 135 355 S30 570 145 720" fill="none" stroke="#252824" strokeWidth="18" />
        <Path d="M332 -20 C275 120 365 220 292 332 S228 570 350 710" fill="none" stroke="#30332E" strokeWidth="24" />
        <Path d="M-30 160 C80 110 92 240 205 205 S330 85 430 140" fill="none" stroke="#565B53" strokeDasharray="7 10" strokeWidth="2" />
        <Path d="M65 0 C42 145 170 220 135 355 S30 570 145 720" fill="none" stroke="#4A4F48" strokeDasharray="7 10" strokeWidth="2" />
        <Path d="M64 290 C132 330 208 290 270 230" fill="none" stroke={couleurs.primaire} strokeLinecap="round" strokeWidth="7" />
        <Circle cx="64" cy="290" r="10" fill={couleurs.surface} stroke={couleurs.primaire} strokeWidth="5" />
        <Circle cx="270" cy="230" r="11" fill={couleurs.primaire} stroke={couleurs.encre} strokeWidth="4" />
      </Svg>
    </View>
  );
}
