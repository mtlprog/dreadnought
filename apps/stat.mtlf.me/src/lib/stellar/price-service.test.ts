import { describe, expect, test } from "bun:test";
import { ManagedRuntime } from "effect";
import { PriceServiceLive, PriceServiceTag } from "./price-service";
import type { AssetInfo } from "./types";

describe("PriceService", () => {
  describe("getTokenPrice", () => {
    test("should calculate price via path finding for MTL/EURMTL", async () => {
      const testRuntime = ManagedRuntime.make(PriceServiceLive);

      try {
        const priceService = await testRuntime.runPromise(PriceServiceTag);

        const MTL_ASSET: AssetInfo = {
          code: "MTL",
          issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
          type: "credit_alphanum4",
        };

        const EURMTL_ASSET: AssetInfo = {
          code: "EURMTL",
          issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
          type: "credit_alphanum4",
        };

        const result = await testRuntime.runPromise(
          priceService.getTokenPrice(MTL_ASSET, EURMTL_ASSET),
        );

        expect(result.tokenA).toBe("MTL:GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
        expect(result.tokenB).toBe("EURMTL:GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
        expect(result.price).toBeDefined();
        expect(parseFloat(result.price)).toBeGreaterThan(0);

        // New behavior: result can be "path", "orderbook", or "best"
        expect(result.details).toBeDefined();
        if (result.details !== null && result.details !== undefined) {
          expect(["path", "orderbook", "best"]).toContain(result.details.source);
        }

        // If "best" source, check pathDetails has path
        if (result.details?.source === "best") {
          if (result.details.pathDetails !== null && result.details.pathDetails !== undefined) {
            expect(result.details.pathDetails.path).toBeDefined();
            expect(result.details.pathDetails.path.length).toBeGreaterThan(0);
          }
        } else if (result.details?.source === "path") {
          expect(result.details.path).toBeDefined();
          expect(result.details.path.length).toBeGreaterThan(0);
        }
      } finally {
        await testRuntime.dispose();
      }
    }, 30000);

    test("should calculate price via path finding for XLM/EURMTL", async () => {
      const testRuntime = ManagedRuntime.make(PriceServiceLive);

      try {
        const priceService = await testRuntime.runPromise(PriceServiceTag);

        const XLM_ASSET: AssetInfo = {
          code: "XLM",
          issuer: "",
          type: "native",
        };

        const EURMTL_ASSET: AssetInfo = {
          code: "EURMTL",
          issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
          type: "credit_alphanum4",
        };

        const result = await testRuntime.runPromise(
          priceService.getTokenPrice(XLM_ASSET, EURMTL_ASSET),
        );

        expect(result.tokenA).toBe("XLM");
        expect(result.tokenB).toBe("EURMTL:GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
        expect(result.price).toBeDefined();
        expect(parseFloat(result.price)).toBeGreaterThan(0);

        // New behavior: result can be "path", "orderbook", or "best"
        expect(result.details).toBeDefined();
        if (result.details !== null && result.details !== undefined) {
          expect(["path", "orderbook", "best"]).toContain(result.details.source);
        }
      } finally {
        await testRuntime.dispose();
      }
    }, 30000);

    test("should include path hops in details", async () => {
      const testRuntime = ManagedRuntime.make(PriceServiceLive);

      try {
        const priceService = await testRuntime.runPromise(PriceServiceTag);

        const MTL_ASSET: AssetInfo = {
          code: "MTL",
          issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
          type: "credit_alphanum4",
        };

        const EURMTL_ASSET: AssetInfo = {
          code: "EURMTL",
          issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
          type: "credit_alphanum4",
        };

        const result = await testRuntime.runPromise(
          priceService.getTokenPrice(MTL_ASSET, EURMTL_ASSET),
        );

        expect(result.details).toBeDefined();

        // Verify path structure based on source type
        if (result.details?.source === "path") {
          expect(result.details.path).toBeDefined();
          const path = result.details.path ?? [];
          for (const hop of path) {
            expect(hop.from).toBeDefined();
            expect(hop.to).toBeDefined();
            expect(typeof hop.from).toBe("string");
            expect(typeof hop.to).toBe("string");
          }
        } else if (result.details?.source === "best") {
          // For "best", path may be in pathDetails
          if (result.details.pathDetails !== null && result.details.pathDetails !== undefined) {
            expect(result.details.pathDetails.path).toBeDefined();
            const path = result.details.pathDetails.path ?? [];
            for (const hop of path) {
              expect(hop.from).toBeDefined();
              expect(hop.to).toBeDefined();
              expect(typeof hop.from).toBe("string");
              expect(typeof hop.to).toBe("string");
            }
          }
        }
      } finally {
        await testRuntime.dispose();
      }
    }, 30000);
  });

  describe("getTokensWithPrices", () => {
    test("should calculate prices for multiple tokens", async () => {
      const testRuntime = ManagedRuntime.make(PriceServiceLive);

      try {
        const priceService = await testRuntime.runPromise(PriceServiceTag);

        const MTL_ASSET: AssetInfo = {
          code: "MTL",
          issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
          type: "credit_alphanum4",
        };

        const EURMTL_ASSET: AssetInfo = {
          code: "EURMTL",
          issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
          type: "credit_alphanum4",
        };

        const XLM_ASSET: AssetInfo = {
          code: "XLM",
          issuer: "",
          type: "native",
        };

        const tokens = [
          { asset: MTL_ASSET, balance: "100.0000000" },
          { asset: XLM_ASSET, balance: "50.0000000" },
        ];

        const result = await testRuntime.runPromise(
          priceService.getTokensWithPrices(tokens, {
            eurmtl: EURMTL_ASSET,
            xlm: XLM_ASSET,
          }),
        );

        expect(result.length).toBe(2);

        // Check MTL token
        expect(result[0]?.asset.code).toBe("MTL");
        expect(result[0]?.balance).toBe("100.0000000");
        expect(result[0]?.priceInEURMTL).toBeDefined();
        expect(result[0]?.priceInXLM).toBeDefined();

        // Check XLM token
        expect(result[1]?.asset.code).toBe("XLM");
        expect(result[1]?.balance).toBe("50.0000000");
        expect(result[1]?.priceInEURMTL).toBeDefined();
        // XLM price in XLM should be "1.0"
        expect(result[1]?.priceInXLM).toBe("1");
      } finally {
        await testRuntime.dispose();
      }
    }, 60000);

    test("should calculate value from price and balance", async () => {
      const testRuntime = ManagedRuntime.make(PriceServiceLive);

      try {
        const priceService = await testRuntime.runPromise(PriceServiceTag);

        const MTL_ASSET: AssetInfo = {
          code: "MTL",
          issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
          type: "credit_alphanum4",
        };

        const EURMTL_ASSET: AssetInfo = {
          code: "EURMTL",
          issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
          type: "credit_alphanum4",
        };

        const XLM_ASSET: AssetInfo = {
          code: "XLM",
          issuer: "",
          type: "native",
        };

        const tokens = [{ asset: MTL_ASSET, balance: "100.0000000" }];

        const result = await testRuntime.runPromise(
          priceService.getTokensWithPrices(tokens, {
            eurmtl: EURMTL_ASSET,
            xlm: XLM_ASSET,
          }),
        );

        const mtlResult = result[0];
        expect(mtlResult).toBeDefined();

        if (mtlResult?.priceInEURMTL != null && mtlResult?.valueInEURMTL != null) {
          const spotPrice = parseFloat(mtlResult.priceInEURMTL);
          const fullBalanceValue = parseFloat(mtlResult.valueInEURMTL);
          const expectedFromSpot = 100 * spotPrice;

          // Full balance value can differ from spot price * balance due to:
          // 1. Slippage in path finding
          // 2. Orderbook being chosen as best source with different price
          // Allow up to 5% difference
          const difference = Math.abs(fullBalanceValue - expectedFromSpot);
          const percentDiff = (difference / expectedFromSpot) * 100;
          expect(percentDiff).toBeLessThan(5);
        }

        if (mtlResult?.priceInXLM != null && mtlResult?.valueInXLM != null) {
          const spotPrice = parseFloat(mtlResult.priceInXLM);
          const fullBalanceValue = parseFloat(mtlResult.valueInXLM);
          const expectedFromSpot = 100 * spotPrice;

          // Allow up to 5% difference
          const difference = Math.abs(fullBalanceValue - expectedFromSpot);
          const percentDiff = (difference / expectedFromSpot) * 100;
          expect(percentDiff).toBeLessThan(5);
        }
      } finally {
        await testRuntime.dispose();
      }
    }, 60000);

    test("should handle pricing errors gracefully", async () => {
      const testRuntime = ManagedRuntime.make(PriceServiceLive);

      try {
        const priceService = await testRuntime.runPromise(PriceServiceTag);

        const INVALID_ASSET: AssetInfo = {
          code: "INVALID",
          issuer: "GINVALIDINVALIDINVALIDINVALIDINVALIDINVALIDINVALID",
          type: "credit_alphanum4",
        };

        const EURMTL_ASSET: AssetInfo = {
          code: "EURMTL",
          issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
          type: "credit_alphanum4",
        };

        const XLM_ASSET: AssetInfo = {
          code: "XLM",
          issuer: "",
          type: "native",
        };

        const tokens = [{ asset: INVALID_ASSET, balance: "100.0000000" }];

        const result = await testRuntime.runPromise(
          priceService.getTokensWithPrices(tokens, {
            eurmtl: EURMTL_ASSET,
            xlm: XLM_ASSET,
          }),
        );

        expect(result.length).toBe(1);
        const invalidResult = result[0];

        // Prices should be null for invalid asset
        expect(invalidResult?.priceInEURMTL).toBeNull();
        expect(invalidResult?.priceInXLM).toBeNull();
        expect(invalidResult?.valueInEURMTL).toBeNull();
        expect(invalidResult?.valueInXLM).toBeNull();
      } finally {
        await testRuntime.dispose();
      }
    }, 60000);
  });
});
