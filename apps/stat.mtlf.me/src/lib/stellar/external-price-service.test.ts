import { describe, expect, test } from "bun:test";
import { ManagedRuntime } from "effect";
import {
  ExternalPriceServiceLive,
  ExternalPriceServiceTag,
} from "./external-price-service";

describe("ExternalPriceService", () => {
  describe("isExternalPriceSymbol", () => {
    test("should return true for valid symbols", async () => {
      const testRuntime = ManagedRuntime.make(ExternalPriceServiceLive);
      try {
        const service = await testRuntime.runPromise(ExternalPriceServiceTag);

        expect(service.isExternalPriceSymbol("BTC")).toBe(true);
        expect(service.isExternalPriceSymbol("ETH")).toBe(true);
        expect(service.isExternalPriceSymbol("XLM")).toBe(true);
        expect(service.isExternalPriceSymbol("Sats")).toBe(true);
        expect(service.isExternalPriceSymbol("USD")).toBe(true);
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should return false for invalid symbols", async () => {
      const testRuntime = ManagedRuntime.make(ExternalPriceServiceLive);
      try {
        const service = await testRuntime.runPromise(ExternalPriceServiceTag);

        expect(service.isExternalPriceSymbol("INVALID")).toBe(false);
        expect(service.isExternalPriceSymbol("btc")).toBe(false);
        expect(service.isExternalPriceSymbol("")).toBe(false);
        expect(service.isExternalPriceSymbol("123")).toBe(false);
      } finally {
        await testRuntime.dispose();
      }
    });
  });

  describe("clearCache", () => {
    test("should clear the cache successfully", async () => {
      const testRuntime = ManagedRuntime.make(ExternalPriceServiceLive);
      try {
        const service = await testRuntime.runPromise(ExternalPriceServiceTag);

        // This should complete without error
        await testRuntime.runPromise(service.clearCache());
      } finally {
        await testRuntime.dispose();
      }
    });
  });

  // Note: Live API tests are skipped to avoid rate limiting during CI
  // Uncomment for manual testing
  /*
  describe("getPriceInEUR (live API)", () => {
    test("should fetch BTC price", async () => {
      const testRuntime = ManagedRuntime.make(ExternalPriceServiceLive);
      try {
        const service = await testRuntime.runPromise(ExternalPriceServiceTag);
        await testRuntime.runPromise(service.clearCache());

        const price = await testRuntime.runPromise(service.getPriceInEUR("BTC"));

        expect(price).toBeGreaterThan(0);
        console.log(`BTC price: ${price} EUR`);
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should fetch Sats price (1/100_000_000 of BTC)", async () => {
      const testRuntime = ManagedRuntime.make(ExternalPriceServiceLive);
      try {
        const service = await testRuntime.runPromise(ExternalPriceServiceTag);
        await testRuntime.runPromise(service.clearCache());

        const satsPrice = await testRuntime.runPromise(service.getPriceInEUR("Sats"));
        const btcPrice = await testRuntime.runPromise(service.getPriceInEUR("BTC"));

        // Sats should be 1/100_000_000 of BTC
        expect(satsPrice).toBeCloseTo(btcPrice / 100_000_000, 10);
        console.log(`Sats price: ${satsPrice} EUR`);
      } finally {
        await testRuntime.dispose();
      }
    });
  });
  */
});
