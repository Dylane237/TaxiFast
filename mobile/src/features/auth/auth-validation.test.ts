import { describe, expect, it } from "vitest";
import { codeOtpValide, normaliserTelephone, placesValides } from "./auth-validation";

describe("validation de l’authentification", () => {
  it("normalise les numéros camerounais locaux et internationaux", () => {
    expect(normaliserTelephone("690 00 00 01")).toBe("+237690000001");
    expect(normaliserTelephone("+237 690 00 00 01")).toBe("+237690000001");
  });

  it("refuse un numéro qui n’est pas un mobile camerounais", () => {
    expect(normaliserTelephone("+237590000001")).toBeNull();
    expect(normaliserTelephone("69000001")).toBeNull();
  });

  it("valide le code à quatre chiffres et les places du véhicule", () => {
    expect(codeOtpValide("1234")).toBe(true);
    expect(codeOtpValide("123456")).toBe(false);
    expect(placesValides("4")).toBe(true);
    expect(placesValides("0")).toBe(false);
    expect(placesValides("9")).toBe(false);
  });
});
