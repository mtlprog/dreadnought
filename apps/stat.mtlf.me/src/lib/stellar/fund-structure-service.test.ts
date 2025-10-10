import { describe, expect, test } from "bun:test";
import { Effect, ManagedRuntime, pipe } from "effect";
import { FundStructureServiceLive, FundStructureServiceTag } from "./fund-structure-service";

describe("FundStructureService", () => {
  test("should return fund accounts", async () => {
    const testRuntime = ManagedRuntime.make(FundStructureServiceLive);

    try {
      const program = pipe(
        FundStructureServiceTag,
        Effect.flatMap((service) => service.getFundAccounts()),
      );

      const result = await testRuntime.runPromise(program);

      // 1 Issuer + 3 Subfonds + 2 Mutuals + 1 Operational + 3 Others = 10 accounts
      expect(result).toHaveLength(10);
      expect(result[0]).toMatchObject({
        id: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
        name: "MAIN ISSUER",
        type: "issuer",
      });

      expect(result[1]).toMatchObject({
        name: "MABIZ",
        type: "subfond",
      });

      // LABR is now type "other"
      expect(result[7]).toMatchObject({
        name: "LABR",
        type: "other",
      });
    } finally {
      await testRuntime.dispose();
    }
  });

  test("should have all required account fields", async () => {
    const testRuntime = ManagedRuntime.make(FundStructureServiceLive);

    try {
      const program = pipe(
        FundStructureServiceTag,
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
        expect(["issuer", "subfond", "mutual", "operational", "other"]).toContain(account.type);
      }
    } finally {
      await testRuntime.dispose();
    }
  });

  test("should include all specified subfonds", async () => {
    const testRuntime = ManagedRuntime.make(FundStructureServiceLive);

    try {
      const program = pipe(
        FundStructureServiceTag,
        Effect.flatMap((service) => service.getFundAccounts()),
      );

      const result = await testRuntime.runPromise(program);

      const subfondNames = result
        .filter(account => account.type === "subfond")
        .map(account => account.name);

      // Only 3 subfonds: MABIZ, CITY, DEFI
      expect(subfondNames).toContain("MABIZ");
      expect(subfondNames).toContain("CITY");
      expect(subfondNames).toContain("DEFI");
      expect(subfondNames).toHaveLength(3);

      // LABR and MTLM are now type "other"
      const otherNames = result
        .filter(account => account.type === "other")
        .map(account => account.name);

      expect(otherNames).toContain("LABR");
      expect(otherNames).toContain("MTLM");
      expect(otherNames).toContain("PROGRAMMERS GUILD");
      expect(otherNames).toHaveLength(3);
    } finally {
      await testRuntime.dispose();
    }
  });

  // Note: getFundStructure test would require mocking Stellar API calls
  // which is beyond the scope of this basic test suite
});
