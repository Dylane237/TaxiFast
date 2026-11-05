import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Le serveur exige un JWT_SECRET : les tests reçoivent le leur, qui ne sert nulle part ailleurs.
    env: { JWT_SECRET: "secret-de-test-uniquement-0123456789abcdef" },
  },
});
