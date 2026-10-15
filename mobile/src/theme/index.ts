export const couleurs = {
  fond: "#F7F7F4",
  surface: "#FFFFFF",
  surfaceSecondaire: "#F0F1ED",
  texte: "#171914",
  texteSecondaire: "#62675F",
  primaire: "#FFD43B",
  primairePresse: "#E5B91F",
  primaireClaire: "#FFF7D1",
  encre: "#151712",
  encreDouce: "#252821",
  texteInverseSecondaire: "#C7CBC1",
  bordure: "#DFE2DA",
  succes: "#207A4A",
  succesClaire: "#E4F4EA",
  erreur: "#B42318",
  erreurClaire: "#FEECEB",
  attention: "#9A6700",
  attentionClaire: "#FFF3C4",
  desactive: "#B6BAB3",
} as const;

export const espacements = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 30,
} as const;

export const rayons = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  rond: 999,
} as const;

export const taillesTexte = {
  micro: 11,
  petit: 13,
  normal: 15,
  titre: 22,
  hero: 28,
} as const;

export const mouvements = {
  rapide: 140,
  standard: 240,
  lent: 360,
  ressort: { damping: 18, stiffness: 220, mass: 0.7 },
} as const;

export const ombres = {
  carte: {
    shadowColor: "#151714",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.025,
    shadowRadius: 6,
    elevation: 1,
  },
  feuille: {
    shadowColor: "#151714",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
