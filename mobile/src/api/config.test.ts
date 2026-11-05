import { describe, expect, it } from "vitest";
import { resoudreConfigApi } from "./config";

describe("choix du mode démo ou du vrai serveur", () => {
  it("reste en démo par défaut en développement", () => {
    expect(resoudreConfigApi({}, false)).toEqual({ modeDemo: true, urlServeur: "http://localhost:3000" });
  });

  it("n'est jamais en démo par défaut dans un build release", () => {
    expect(resoudreConfigApi({ apiUrl: "https://api.taxifast.cm" }, true)).toEqual({
      modeDemo: false,
      urlServeur: "https://api.taxifast.cm",
    });
  });

  it("accepte la démo dans un build release seulement si on la demande", () => {
    expect(resoudreConfigApi({ useMock: "true" }, true).modeDemo).toBe(true);
  });

  it("refuse un build release sans adresse de serveur", () => {
    expect(() => resoudreConfigApi({}, true)).toThrow(/EXPO_PUBLIC_API_URL est obligatoire/);
    expect(() => resoudreConfigApi({ useMock: "false", apiUrl: "  " }, true)).toThrow(/obligatoire/);
  });

  it("refuse une adresse non chiffrée dans un build release", () => {
    expect(() => resoudreConfigApi({ apiUrl: "http://192.168.1.20:3000" }, true)).toThrow(/https/);
  });

  it("accepte le http local en développement et retire la barre finale", () => {
    expect(resoudreConfigApi({ useMock: "false", apiUrl: "http://192.168.1.20:3000/" }, false)).toEqual({
      modeDemo: false,
      urlServeur: "http://192.168.1.20:3000",
    });
  });

  it("ne prend que \"true\" au pied de la lettre pour activer la démo", () => {
    expect(resoudreConfigApi({ useMock: "oui", apiUrl: "https://api.taxifast.cm" }, true).modeDemo).toBe(false);
  });
});
