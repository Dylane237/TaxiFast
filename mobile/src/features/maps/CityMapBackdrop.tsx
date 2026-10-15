import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { couleurs, rayons, taillesTexte } from "@/theme";

type CityMapBackdropProps = {
  route?: boolean;
  destinationLabel?: string;
};

export function CityMapBackdrop({ route = false, destinationLabel }: CityMapBackdropProps) {
  return (
    <View style={styles.root}>
      <Svg height="100%" viewBox="0 0 420 820" width="100%">
        <Rect fill="#EEF0EA" height="820" width="420" />
        <Path d="M-20 124 C72 86 116 110 178 74 C252 30 316 66 448 10 L448 0 L-20 0Z" fill="#DFE9D8" />
        <Path d="M318 -20 C276 112 330 194 286 286 C246 370 264 474 432 560" fill="none" stroke="#DDECF0" strokeWidth="54" />
        <Path d="M-46 646 C74 604 114 638 208 574 C302 510 350 532 474 476" fill="none" stroke="#FFFFFF" strokeWidth="38" />
        <Path d="M-34 210 C72 172 124 204 212 160 C296 118 352 138 454 104" fill="none" stroke="#FFFFFF" strokeWidth="22" />
        <Path d="M28 -20 C44 100 82 154 70 252 C56 356 90 432 42 536 C18 588 12 690 36 850" fill="none" stroke="#FFFFFF" strokeWidth="17" />
        <Path d="M-20 396 C74 350 138 372 198 332 C268 286 342 306 446 258" fill="none" stroke="#FFFFFF" strokeWidth="18" />
        <Path d="M116 -16 C120 104 154 166 146 246 C136 350 176 440 160 536 C146 632 178 728 208 850" fill="none" stroke="#FAFBF8" strokeWidth="10" />
        <Path d="M236 -16 C218 112 248 194 226 272 C206 350 222 450 250 524 C286 616 266 724 276 850" fill="none" stroke="#FAFBF8" strokeWidth="11" />
        <Path d="M356 4 C344 92 368 162 350 244 C330 336 350 410 328 492 C300 590 330 702 376 834" fill="none" stroke="#FAFBF8" strokeWidth="9" />
        <Path d="M-20 300 C92 270 166 286 242 230 C306 184 352 194 448 174" fill="none" stroke="#FAFBF8" strokeWidth="9" />
        <Path d="M-20 492 C72 458 158 474 236 426 C310 380 360 390 448 350" fill="none" stroke="#FAFBF8" strokeWidth="9" />
        <Path d="M-20 730 C82 694 166 718 250 666 C324 620 366 634 448 604" fill="none" stroke="#FAFBF8" strokeWidth="10" />
        {route ? <>
          <Path d="M74 626 C90 544 150 520 168 452 C190 370 254 350 278 286 C296 238 326 222 354 188" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="14" />
          <Path d="M74 626 C90 544 150 520 168 452 C190 370 254 350 278 286 C296 238 326 222 354 188" fill="none" stroke="#171914" strokeLinecap="round" strokeWidth="7" />
          <Circle cx="74" cy="626" fill={couleurs.surface} r="11" stroke={couleurs.texte} strokeWidth="5" />
          <Circle cx="354" cy="188" fill={couleurs.primaire} r="12" stroke={couleurs.texte} strokeWidth="5" />
          <Circle cx="168" cy="452" fill={couleurs.surface} r="7" stroke={couleurs.texte} strokeWidth="4" />
          <Circle cx="278" cy="286" fill={couleurs.surface} r="7" stroke={couleurs.texte} strokeWidth="4" />
        </> : <>
          <Circle cx="196" cy="344" fill="#FFFFFF" r="25" opacity="0.9" />
          <Circle cx="196" cy="344" fill={couleurs.primaire} r="12" stroke={couleurs.texte} strokeWidth="4" />
          <Circle cx="196" cy="344" fill={couleurs.texte} r="3" />
        </>}
      </Svg>
      <View style={styles.districtOne}><Text style={styles.district}>BONANJO</Text></View>
      <View style={styles.districtTwo}><Text style={styles.district}>AKWA</Text></View>
      <View style={styles.roadLabel}><Text style={styles.road}>Boulevard de la Liberté</Text></View>
      {route && destinationLabel ? <View style={styles.destination}><Text numberOfLines={1} style={styles.destinationText}>{destinationLabel}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", inset: 0, overflow: "hidden" },
  districtOne: { position: "absolute", left: 52, top: "28%" },
  districtTwo: { position: "absolute", right: 42, top: "47%" },
  district: { color: "#969B91", fontSize: taillesTexte.micro, fontWeight: "900", letterSpacing: 1.2 },
  roadLabel: { position: "absolute", left: 118, top: "57%", transform: [{ rotate: "-26deg" }] },
  road: { color: "#A6ABA1", fontSize: 10, fontWeight: "700" },
  destination: { position: "absolute", right: 28, top: "19%", maxWidth: 180, paddingHorizontal: 12, paddingVertical: 8, borderRadius: rayons.rond, backgroundColor: couleurs.surface },
  destinationText: { color: couleurs.texte, fontSize: taillesTexte.micro, fontWeight: "900" },
});
