import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import { Figtree_800ExtraBold } from "@expo-google-fonts/figtree/800ExtraBold";
import { polices } from "./index";

// On importe graisse par graisse : passer par l'index du paquet embarquerait toutes les variantes.
export const sourcesPolices = {
  [polices.texte]: Figtree_400Regular,
  [polices.texteDemiGras]: Figtree_600SemiBold,
  [polices.texteGras]: Figtree_700Bold,
  [polices.texteExtraGras]: Figtree_800ExtraBold,
  [polices.titre]: BricolageGrotesque_800ExtraBold,
};
