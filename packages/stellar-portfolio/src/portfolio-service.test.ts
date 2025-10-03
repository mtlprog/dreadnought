import type { StellarError } from "@dreadnought/stellar-core";
import { describe, expect, test } from "bun:test";
import { Effect, Layer, ManagedRuntime, pipe } from "effect";
import { type AccountPortfolio, PortfolioServiceTag } from "./portfolio-service";

// Mock PortfolioService for testing
const createMockPortfolioService = (mockResponse: AccountPortfolio | StellarError) => {
  return Layer.succeed(PortfolioServiceTag, {
    getAccountPortfolio: (_accountId: string) =>
      mockResponse instanceof Error
        ? Effect.fail(mockResponse)
        : Effect.succeed(mockResponse),
  });
};

describe("PortfolioService", () => {
  describe("Mock Service", () => {
    test("should return account portfolio", async () => {
      const mockPortfolio: AccountPortfolio = {
        accountId: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
        tokens: [
          {
            asset: {
              code: "EURMTL",
              issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
              type: "credit_alphanum4",
            },
            balance: "1000.0000000",
          },
        ],
        xlmBalance: "100.0000000",
      };

      const testRuntime = ManagedRuntime.make(createMockPortfolioService(mockPortfolio));

      try {
        const program = pipe(
          PortfolioServiceTag,
          Effect.flatMap((service) =>
            service.getAccountPortfolio("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V")
          ),
        );

        const result = await testRuntime.runPromise(program);

        expect(result.accountId).toBe("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
        expect(result.tokens.length).toBe(1);
        expect(result.tokens[0]?.asset.code).toBe("EURMTL");
        expect(result.xlmBalance).toBe("100.0000000");
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should handle empty portfolio", async () => {
      const mockPortfolio: AccountPortfolio = {
        accountId: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
        tokens: [],
        xlmBalance: "10.0000000",
      };

      const testRuntime = ManagedRuntime.make(createMockPortfolioService(mockPortfolio));

      try {
        const program = pipe(
          PortfolioServiceTag,
          Effect.flatMap((service) =>
            service.getAccountPortfolio("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V")
          ),
        );

        const result = await testRuntime.runPromise(program);

        expect(result.tokens.length).toBe(0);
        expect(result.xlmBalance).toBe("10.0000000");
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should handle multiple tokens", async () => {
      const mockPortfolio: AccountPortfolio = {
        accountId: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
        tokens: [
          {
            asset: {
              code: "EURMTL",
              issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
              type: "credit_alphanum4",
            },
            balance: "1000.0000000",
          },
          {
            asset: {
              code: "USDC",
              issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
              type: "credit_alphanum4",
            },
            balance: "500.0000000",
          },
        ],
        xlmBalance: "100.0000000",
      };

      const testRuntime = ManagedRuntime.make(createMockPortfolioService(mockPortfolio));

      try {
        const program = pipe(
          PortfolioServiceTag,
          Effect.flatMap((service) =>
            service.getAccountPortfolio("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V")
          ),
        );

        const result = await testRuntime.runPromise(program);

        expect(result.tokens.length).toBe(2);
        expect(result.tokens[0]?.asset.code).toBe("EURMTL");
        expect(result.tokens[1]?.asset.code).toBe("USDC");
      } finally {
        await testRuntime.dispose();
      }
    });
  });

  describe("Type Safety", () => {
    test("should enforce readonly tokens array", () => {
      const portfolio: AccountPortfolio = {
        accountId: "GABC",
        tokens: [],
        xlmBalance: "0",
      };

      // TypeScript will prevent this at compile time:
      // portfolio.tokens.push({ asset: ..., balance: "..." }); // Error!

      expect(portfolio.tokens).toEqual([]);
    });

    test("should handle optional limit field", () => {
      const mockPortfolio: AccountPortfolio = {
        accountId: "GABC",
        tokens: [
          {
            asset: {
              code: "EURMTL",
              issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
              type: "credit_alphanum4",
            },
            balance: "1000.0000000",
            limit: "10000.0000000",
          },
        ],
        xlmBalance: "100.0000000",
      };

      expect(mockPortfolio.tokens[0]?.limit).toBe("10000.0000000");
    });
  });
});
