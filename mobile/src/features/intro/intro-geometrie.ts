/**
 * Géométrie et minutage de l'intro.
 *
 * Le logo est dessiné dans le repère de assets/brand/logo.svg (1024 × 1024).
 * L'écran de lancement natif affiche splash-icon.png, c'est-à-dire ce dessin
 * recadré (translate(-125 -84) scale(1.18)) sur LOGO_TAILLE dp de large.
 * L'intro reprend exactement ce cadrage pour que le passage soit invisible.
 */

export const LOGO_TAILLE = 240;

const RECADRAGE = { echelle: 1.18, x: -125, y: -84 };
const DECALAGE_DESSIN = { x: -34, y: 60 };

/** Matrice SVG qui place le dessin d'origine dans le cadrage de l'écran de lancement. */
const arrondi = (valeur: number) => Number(valeur.toFixed(3));
export const MATRICE_RECADRAGE = `matrix(${RECADRAGE.echelle} 0 0 ${RECADRAGE.echelle} ${arrondi(
  RECADRAGE.echelle * DECALAGE_DESSIN.x + RECADRAGE.x,
)} ${arrondi(RECADRAGE.echelle * DECALAGE_DESSIN.y + RECADRAGE.y)})`;

/** Convertit un point du dessin d'origine en dp dans la boîte du logo. */
export function versBoite(x: number, y: number) {
  const k = (RECADRAGE.echelle * LOGO_TAILLE) / 1024;
  const decalage = LOGO_TAILLE / 1024;
  return {
    x: k * (x + DECALAGE_DESSIN.x) + RECADRAGE.x * decalage,
    y: k * (y + DECALAGE_DESSIN.y) + RECADRAGE.y * decalage,
  };
}

export function versLongueur(longueur: number) {
  return (RECADRAGE.echelle * LOGO_TAILLE * longueur) / 1024;
}

export const SOLEIL = {
  centre: versBoite(568, 452),
  rayon: versLongueur(262),
  anneauRayon: versLongueur(228),
  anneauEpaisseur: versLongueur(12),
};

/**
 * Échelle à donner au soleil pour qu'il recouvre tout l'écran,
 * le logo étant centré dans un écran de largeur × hauteur.
 */
export function echelleSoleilPourCouvrir(largeur: number, hauteur: number) {
  const cx = largeur / 2 - LOGO_TAILLE / 2 + SOLEIL.centre.x;
  const cy = hauteur / 2 - LOGO_TAILLE / 2 + SOLEIL.centre.y;
  const coinLePlusLoin = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(largeur - cx, cy),
    Math.hypot(cx, hauteur - cy),
    Math.hypot(largeur - cx, hauteur - cy),
  );
  return (coinLePlusLoin / SOLEIL.rayon) * 1.04;
}

/**
 * Minutage en millisecondes. `attente` court à partir du moment où l'app est prête :
 * on laisse le premier écran se monter derrière avant d'animer, pour ne pas saccader
 * sur les petits téléphones. Les autres délais partent du lancement de l'animation.
 */
export const MINUTAGE = {
  attente: 220,
  recul: 160,
  depart: 460,
  soleilDebut: 420,
  soleilDuree: 560,
  anneauDuree: 240,
  sortie: 280,
  sortieReduite: 200,
} as const;

/** Durée entre le moment où l'app est prête et l'écran entièrement jaune. */
export function dureeAvantCouverture() {
  return MINUTAGE.attente + MINUTAGE.soleilDebut + MINUTAGE.soleilDuree;
}
