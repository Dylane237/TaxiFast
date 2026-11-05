import { describe, expect, it, vi } from "vitest";
import { delaiApparitionListe, ECART_CASCADE, ELEMENTS_ANIMES } from "./animations";

vi.mock("expo-haptics", () => ({ notificationAsync: vi.fn(), NotificationFeedbackType: { Success: "success" } }));

describe("apparition en cascade des listes", () => {
  it("décale chaque élément du même écart", () => {
    expect(delaiApparitionListe(0)).toBe(0);
    expect(delaiApparitionListe(1)).toBe(ECART_CASCADE);
    expect(delaiApparitionListe(ELEMENTS_ANIMES - 1)).toBe((ELEMENTS_ANIMES - 1) * ECART_CASCADE);
  });

  it("n'anime pas au-delà des premiers éléments", () => {
    expect(delaiApparitionListe(ELEMENTS_ANIMES)).toBeNull();
    expect(delaiApparitionListe(40)).toBeNull();
  });

  it("ignore les index invalides", () => {
    expect(delaiApparitionListe(-1)).toBeNull();
    expect(delaiApparitionListe(1.5)).toBeNull();
  });

  it("garde la cascade sous les 300 ms", () => {
    expect((ELEMENTS_ANIMES - 1) * ECART_CASCADE).toBeLessThan(300);
  });
});
