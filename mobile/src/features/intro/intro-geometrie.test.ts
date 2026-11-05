import { describe, expect, it } from "vitest";
import {
  dureeAvantCouverture,
  echelleSoleilPourCouvrir,
  LOGO_TAILLE,
  MATRICE_RECADRAGE,
  MINUTAGE,
  SOLEIL,
  versBoite,
} from "./intro-geometrie";

describe("cadrage du logo", () => {
  it("reprend le recadrage de splash-icon.png", () => {
    expect(MATRICE_RECADRAGE).toBe("matrix(1.18 0 0 1.18 -165.12 -13.2)");
  });

  it("place le soleil presque au centre de la boîte", () => {
    expect(SOLEIL.centre.x).toBeCloseTo(118.4, 1);
    expect(SOLEIL.centre.y).toBeCloseTo(121.9, 1);
    expect(SOLEIL.rayon).toBeCloseTo(72.5, 1);
  });

  it("garde les coins du repère d'origine cohérents avec la matrice", () => {
    const origine = versBoite(0, 0);
    expect(origine.x).toBeCloseTo((-165.12 * LOGO_TAILLE) / 1024, 5);
    expect(origine.y).toBeCloseTo((-13.2 * LOGO_TAILLE) / 1024, 5);
  });
});

describe("couverture de l'écran par le soleil", () => {
  it.each([
    [360, 640],
    [412, 915],
    [320, 568],
    [800, 1280],
  ])("recouvre un écran de %i × %i", (largeur, hauteur) => {
    const echelle = echelleSoleilPourCouvrir(largeur, hauteur);
    const rayon = SOLEIL.rayon * echelle;
    const cx = largeur / 2 - LOGO_TAILLE / 2 + SOLEIL.centre.x;
    const cy = hauteur / 2 - LOGO_TAILLE / 2 + SOLEIL.centre.y;
    for (const [x, y] of [[0, 0], [largeur, 0], [0, hauteur], [largeur, hauteur]]) {
      expect(Math.hypot(x - cx, y - cy)).toBeLessThan(rayon);
    }
  });
});

describe("minutage", () => {
  it("révèle l'app moins de 1,3 s après qu'elle est prête", () => {
    expect(dureeAvantCouverture()).toBeLessThanOrEqual(1300);
  });

  it("lance le soleil quand le taxi a déjà pris de l'élan", () => {
    expect(MINUTAGE.soleilDebut).toBeGreaterThan(MINUTAGE.recul + MINUTAGE.depart / 2);
  });
});
