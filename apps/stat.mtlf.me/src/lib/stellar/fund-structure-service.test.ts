import { describe, expect, test } from "bun:test";
import { Effect, ManagedRuntime, pipe } from "effect";
import { FundStructureService, FundStructureServiceLive } from "./fund-structure-service";

describe("FundStructureService", () => {
  test("should return fund accounts", async () => {
    const testRuntime = ManagedRuntime.make(FundStructureServiceLive);

    try {
      const program = pipe(
        FundStructureService,
        Effect.flatMap((service) => service.getFundAccounts()),
      );

      const result = await testRuntime.runPromise(program);

      expect(result).toHaveLength(6);
      expect(result[0]).toMatchObject({
        id: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
        name: "MAIN ISSUER",
        type: "issuer",
      });

      expect(result[1]).toMatchObject({
        name: "MABIZ",
        type: "subfond",
      });

      expect(result[2]).toMatchObject({
        name: "LABR",
        type: "subfond",
      });
    } finally {
      await testRuntime.dispose();
    }
  });

  test("should have all required account fields", async () => {
    const testRuntime = ManagedRuntime.make(FundStructureServiceLive);

    try {
      const program = pipe(
        FundStructureService,
        Effect.flatMap((service) => service.getFundAccounts()),
      );

      const result = await testRuntime.runPromise(program);

      for (const account of result) {
        expect(account).toHaveProperty("id");
        expect(account).toHaveProperty("name");
        expect(account).toHaveProperty("type");
        expect(account).toHaveProperty("description");
        expect(typeof account.id).toBe("string");
        expect(typeof account.name).toBe("string");
        expect(typeof account.description).toBe("string");
        expect(["issuer", "subfond", "operational"]).toContain(account.type);
      }
    } finally {
      await testRuntime.dispose();
    }
  });

  test("should include all specified subfonds", async () => {
    const testRuntime = ManagedRuntime.make(FundStructureServiceLive);

    try {
      const program = pipe(
        FundStructureService,
        Effect.flatMap((service) => service.getFundAccounts()),
      );

      const result = await testRuntime.runPromise(program);

      const subfondNames = result
        .filter(account => account.type === "subfond")
        .map(account => account.name);

      expect(subfondNames).toContain("MABIZ");
      expect(subfondNames).toContain("LABR");
      expect(subfondNames).toContain("CITY");
      expect(subfondNames).toContain("MTLM");
      expect(subfondNames).toContain("DEFI");
    } finally {
      await testRuntime.dispose();
    }
  });

  // Note: getFundStructure test would require mocking Stellar API calls
  // which is beyond the scope of this basic test suite
});
