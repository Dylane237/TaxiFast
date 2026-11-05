import { describe, expect, it } from "vitest";
import {
  capitaliser,
  formatDateTime,
  formatHeure,
  formatJour,
  formatNote,
  formatPlage,
  formatPrice,
  formatTelephone,
} from "./format";

// Dates construites en heure locale, comme sur le téléphone.
const maintenant = new Date(2026, 10, 5, 9, 0);
const local = (jour: number, heure: number, minute = 0) => new Date(2026, 10, jour, heure, minute).toISOString();

describe("heures et jours à la française", () => {
  it("écrit l'heure avec un h", () => {
    expect(formatHeure(local(5, 15, 30))).toBe("15 h 30");
    expect(formatHeure(local(5, 7, 5))).toBe("7 h 05");
    expect(formatHeure(local(5, 15))).toBe("15 h");
  });

  it("dit aujourd'hui, demain ou hier quand c'est le cas", () => {
    expect(formatJour(local(5, 23), maintenant)).toBe("aujourd’hui");
    expect(formatJour(local(6, 1), maintenant)).toBe("demain");
    expect(formatJour(local(4, 1), maintenant)).toBe("hier");
  });

  it("assemble jour et heure", () => {
    expect(formatDateTime(local(5, 15, 30), maintenant)).toBe("aujourd’hui à 15 h 30");
  });

  it("résume une plage sur la même journée sans répéter la date", () => {
    expect(formatPlage(local(5, 15), local(5, 16, 30), maintenant)).toBe("aujourd’hui, de 15 h à 16 h 30");
  });

  it("donne les deux dates quand la plage change de jour", () => {
    expect(formatPlage(local(5, 23), local(6, 1), maintenant)).toBe("de 23 h aujourd’hui à 1 h demain");
  });
});

describe("autres formats", () => {
  it("met une capitale en tête", () => {
    expect(capitaliser("aujourd’hui à 15 h")).toBe("Aujourd’hui à 15 h");
  });

  it("écrit la note avec une virgule", () => {
    expect(formatNote(4.8)).toBe("4,8");
    expect(formatNote(5)).toBe("5,0");
  });

  it("espace un numéro camerounais et laisse les autres", () => {
    expect(formatTelephone("+237690000099")).toBe("+237 6 90 00 00 99");
    expect(formatTelephone("+33612345678")).toBe("+33612345678");
  });

  it("sépare les milliers des prix", () => {
    expect(formatPrice(1500).replace(/\s/g, " ")).toBe("1 500 FCFA");
  });
});
