import { describe, expect, it } from "vitest";
import { itineraireDepuisOsrm, lieuxDepuisPhoton, requete } from "./geo";

describe("paramètres d'URL", () => {
  it("encode les valeurs et ignore celles qui manquent", () => {
    expect(requete({ q: "carrefour Ndokoti & co", lat: undefined, bbox: "8.4,1.6" })).toBe("q=carrefour%20Ndokoti%20%26%20co&bbox=8.4%2C1.6");
  });
});

function lieu(nom: string, props: Record<string, unknown>, coords: [number, number] = [9.74, 4.04]) {
  return { type: "Feature", geometry: { type: "Point", coordinates: coords }, properties: { name: nom, ...props } };
}

describe("lieux Photon", () => {
  it("garde les lieux du Cameroun avec un contexte lisible", () => {
    const lieux = lieuxDepuisPhoton({
      features: [
        lieu("Carrefour Ndokoti", { osm_type: "N", osm_id: 1, district: "Ndokoti", city: "Douala III", countrycode: "CM" }),
        lieu("Mvan", { osm_type: "R", osm_id: 2, city: "Yaoundé", countrycode: "CM" }, [11.52, 3.83]),
        lieu("Calabar", { osm_type: "N", osm_id: 3, city: "Calabar", countrycode: "NG" }),
      ],
    });
    expect(lieux.map((item) => item.nom)).toEqual(["Carrefour Ndokoti", "Mvan"]);
    expect(lieux[0]).toMatchObject({ contexte: "Ndokoti, Douala III", latitude: 4.04, longitude: 9.74 });
    expect(lieux[1]!.contexte).toBe("Yaoundé");
  });

  it("supprime les doublons et ignore les lieux sans nom", () => {
    const doublon = lieu("Carrefour Ndokoti", { district: "Ndokoti", city: "Douala III" });
    const lieux = lieuxDepuisPhoton({ features: [doublon, doublon, { ...doublon, properties: { city: "Douala" } }] });
    expect(lieux).toHaveLength(1);
  });

  it("refuse une réponse qui n'a pas la forme attendue", () => {
    expect(() => lieuxDepuisPhoton({ features: "rien" })).toThrow();
  });
});

describe("itinéraire OSRM", () => {
  it("renvoie la trace, la distance et la durée", () => {
    const itineraire = itineraireDepuisOsrm({
      code: "Ok",
      routes: [{ distance: 1784.3, duration: 146.7, geometry: { coordinates: [[9.705, 4.049], [9.703, 4.05], [9.693, 4.048]] } }],
    });
    expect(itineraire).toEqual({ trace: [[9.705, 4.049], [9.703, 4.05], [9.693, 4.048]], distanceMetres: 1784.3, dureeSecondes: 146.7 });
  });

  it("renvoie null quand aucune route n'existe", () => {
    expect(itineraireDepuisOsrm({ code: "NoRoute", routes: [] })).toBeNull();
  });
});
