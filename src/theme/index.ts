export const couleurs = {
  fond: "#F3F4F0",
  surface: "#FFFFFF",
  surfaceSecondaire: "#ECEEE8",
  texte: "#151714",
  texteSecondaire: "#686D67",
  primaire: "#FFD438",
  primairePresse: "#E7BA1D",
  primaireClaire: "#FFF3B5",
  encre: "#171916",
  bordure: "#E0E3DC",
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
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const rayons = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  rond: 999,
} as const;

export const taillesTexte = {
  petit: 13,
  normal: 16,
  titre: 28,
  hero: 38,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  feuille: {
    shadowColor: "#151714",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
