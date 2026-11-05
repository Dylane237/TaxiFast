import { describe, expect, it } from "vitest";
import { OPTIONS_TRANSACTION } from "./db.js";

describe("options des transactions", () => {
  it("laisse aux transactions plus que les 5 s par défaut de Prisma", () => {
    expect(OPTIONS_TRANSACTION.timeout).toBeGreaterThan(5_000);
    expect(OPTIONS_TRANSACTION.maxWait).toBeGreaterThan(2_000);
  });
});
