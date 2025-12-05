import { describe, expect, test } from "bun:test";
import { ManagedRuntime, Layer } from "effect";
import {
  AssetValuationServiceLive,
  AssetValuationServiceTag,
  type ResolvedAssetValuation,
  type ValuationType,
} from "./asset-valuation-service";
import { ExternalPriceServiceLive } from "./external-price-service";

// Combined layer for tests
const TestLayer = Layer.merge(AssetValuationServiceLive, ExternalPriceServiceLive);

describe("AssetValuationService", () => {
  describe("isNFTBalance", () => {
    test("should return true for exactly 1 stroop", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        expect(service.isNFTBalance("0.0000001")).toBe(true);
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should return false for other balances", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        expect(service.isNFTBalance("0.0000002")).toBe(false);
        expect(service.isNFTBalance("1")).toBe(false);
        expect(service.isNFTBalance("100.5")).toBe(false);
        expect(service.isNFTBalance("0")).toBe(false);
      } finally {
        await testRuntime.dispose();
      }
    });
  });

  describe("findValuation", () => {
    const mockValuations: ResolvedAssetValuation[] = [
      {
        tokenCode: "TOKEN1",
        valuationType: "nft" as ValuationType,
        rawValue: { type: "eurmtl", value: "1000" },
        sourceAccount: "GABC123",
        valueInEURMTL: "1000",
      },
      {
        tokenCode: "TOKEN2",
        valuationType: "unit" as ValuationType,
        rawValue: { type: "eurmtl", value: "10" },
        sourceAccount: "GABC123",
        valueInEURMTL: "10",
      },
      {
        tokenCode: "TOKEN3",
        valuationType: "nft" as ValuationType,
        rawValue: { type: "external", symbol: "BTC" },
        sourceAccount: "GDEF456",
        valueInEURMTL: "50000",
      },
      {
        tokenCode: "TOKEN3",
        valuationType: "unit" as ValuationType,
        rawValue: { type: "eurmtl", value: "5" },
        sourceAccount: "GDEF456",
        valueInEURMTL: "5",
      },
    ];

    test("should find NFT valuation for NFT balance", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        const found = service.findValuation("TOKEN1", mockValuations, true);

        expect(found).not.toBeNull();
        expect(found?.valuationType).toBe("nft");
        expect(found?.valueInEURMTL).toBe("1000");
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should find unit valuation for regular balance", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        const found = service.findValuation("TOKEN2", mockValuations, false);

        expect(found).not.toBeNull();
        expect(found?.valuationType).toBe("unit");
        expect(found?.valueInEURMTL).toBe("10");
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should prefer unit valuation for regular balance when both exist", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        // TOKEN3 has both nft and unit valuations
        const found = service.findValuation("TOKEN3", mockValuations, false);

        expect(found).not.toBeNull();
        expect(found?.valuationType).toBe("unit");
        expect(found?.valueInEURMTL).toBe("5");
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should prefer NFT valuation for NFT balance when both exist", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        // TOKEN3 has both nft and unit valuations
        const found = service.findValuation("TOKEN3", mockValuations, true);

        expect(found).not.toBeNull();
        expect(found?.valuationType).toBe("nft");
        expect(found?.valueInEURMTL).toBe("50000");
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should return null for non-existent token", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        const found = service.findValuation("NONEXISTENT", mockValuations, false);

        expect(found).toBeNull();
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should return null for empty valuations", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        const found = service.findValuation("TOKEN1", [], false);

        expect(found).toBeNull();
      } finally {
        await testRuntime.dispose();
      }
    });
  });

  describe("calculateValueInEURMTL", () => {
    test("should return total value for NFT", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        const valuation: ResolvedAssetValuation = {
          tokenCode: "NFT1",
          valuationType: "nft",
          rawValue: { type: "eurmtl", value: "1000" },
          sourceAccount: "GABC123",
          valueInEURMTL: "1000",
        };

        // For NFT, balance is 1 stroop but value is the total price
        const value = service.calculateValueInEURMTL(valuation, "0.0000001", true);

        expect(value).toBe("1000");
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should multiply balance by unit price for regular assets", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        const valuation: ResolvedAssetValuation = {
          tokenCode: "TOKEN1",
          valuationType: "unit",
          rawValue: { type: "eurmtl", value: "10" },
          sourceAccount: "GABC123",
          valueInEURMTL: "10",
        };

        // 100 units * 10 EUR = 1000 EUR
        const value = service.calculateValueInEURMTL(valuation, "100", false);

        expect(value).toBe("1000");
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should handle decimal balances", async () => {
      const testRuntime = ManagedRuntime.make(TestLayer);
      try {
        const service = await testRuntime.runPromise(AssetValuationServiceTag);

        const valuation: ResolvedAssetValuation = {
          tokenCode: "TOKEN1",
          valuationType: "unit",
          rawValue: { type: "eurmtl", value: "5.5" },
          sourceAccount: "GABC123",
          valueInEURMTL: "5.5",
        };

        // 10.5 units * 5.5 EUR = 57.75 EUR
        const value = service.calculateValueInEURMTL(valuation, "10.5", false);

        expect(parseFloat(value)).toBeCloseTo(57.75, 2);
      } finally {
        await testRuntime.dispose();
      }
    });
  });
});
