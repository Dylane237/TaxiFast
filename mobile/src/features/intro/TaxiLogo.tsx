import { memo } from "react";
import Svg, { Circle, G, Line, Path, Rect, Text } from "react-native-svg";
import { LOGO_TAILLE, MATRICE_RECADRAGE } from "./intro-geometrie";

const ENCRE = "#151712";
const JAUNE = "#FFD43B";
const BLANC = "#FFFFFF";
const FOND = "#F7F7F4";

type TaxiLogoProps = { fond?: string };

/**
 * Le taxi du logo (sans le soleil), dans le cadrage de l'écran de lancement.
 * Le rectangle couleur de fond masque le bas du soleil comme sur splash-icon.png ;
 * il part avec le taxi, ce qui fait « se lever » le soleil.
 */
export const TaxiLogo = memo(function TaxiLogo({ fond = FOND }: TaxiLogoProps) {
  return (
    <Svg width={LOGO_TAILLE} height={LOGO_TAILLE} viewBox="0 0 1024 1024">
      <G transform={MATRICE_RECADRAGE}>
        <Rect x={296} y={600} width={548} height={130} fill={fond} />
        <Path d="M190 690 C260 670 760 668 900 684 C760 704 260 708 190 690 Z" fill={ENCRE} opacity={0.16} />
        <G stroke={ENCRE} strokeLinecap="round" strokeWidth={14}>
          <Line x1={852} y1={540} x2={948} y2={540} />
          <Line x1={852} y1={572} x2={914} y2={572} opacity={0.6} />
          <Line x1={852} y1={604} x2={886} y2={604} opacity={0.3} />
        </G>
        <Path
          d="M222 652 C204 646 196 620 200 598 C203 576 218 563 242 558 L400 530 C440 500 480 466 528 454 C570 446 615 446 650 452 C690 462 722 488 748 510 L806 518 C826 522 834 540 832 560 L828 626 C826 642 816 652 800 652 Z"
          fill={ENCRE}
        />
        <Rect x={556} y={418} width={60} height={36} rx={9} fill={ENCRE} />
        <Rect x={566} y={426} width={40} height={8} rx={4} fill={JAUNE} />
        <Path d="M446 522 C474 500 503 484 536 477 L576 474 L576 522 Z" fill={BLANC} />
        <Path d="M596 474 L638 477 C668 484 694 502 714 520 L596 522 Z" fill={BLANC} />
        <Line x1={254} y1={608} x2={818} y2={608} stroke={BLANC} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
        <Path d="M206 584 C220 571 248 566 274 570 C262 584 236 590 206 590 Z" fill={BLANC} />
        <Path d="M820 532 L834 538 L832 566 L818 563 Z" fill={JAUNE} />
        <Text x={586} y={584} textAnchor="middle" fontWeight="900" fontSize={48} letterSpacing={2} fill={BLANC}>
          TAXI
        </Text>
        {[332, 702].map((cx) => (
          <G key={cx}>
            <Circle cx={cx} cy={652} r={70} fill={fond} />
            <Circle cx={cx} cy={652} r={60} fill={ENCRE} />
            <Circle cx={cx} cy={652} r={34} fill={BLANC} />
            <Circle cx={cx} cy={652} r={12} fill={ENCRE} />
          </G>
        ))}
      </G>
    </Svg>
  );
});
