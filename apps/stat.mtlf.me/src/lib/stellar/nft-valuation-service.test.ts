import { describe, expect, test } from "bun:test";
import { ManagedRuntime } from "effect";
import { NFTValuationServiceLive, NFTValuationServiceTag } from "./nft-valuation-service";

describe("NFTValuationService", () => {
  describe("isNFTBalance", () => {
    test("should return true for 1 stroop (0.0000001)", async () => {
      const runtime = ManagedRuntime.make(NFTValuationServiceLive);
      try {
        const service = await runtime.runPromise(NFTValuationServiceTag);
        expect(service.isNFTBalance("0.0000001")).toBe(true);
      } finally {
        await runtime.dispose();
      }
    });

    test("should return false for other balances", async () => {
      const runtime = ManagedRuntime.make(NFTValuationServiceLive);
      try {
        const service = await runtime.runPromise(NFTValuationServiceTag);
        expect(service.isNFTBalance("1.0000000")).toBe(false);
        expect(service.isNFTBalance("0.0000002")).toBe(false);
        expect(service.isNFTBalance("100")).toBe(false);
        expect(service.isNFTBalance("0")).toBe(false);
      } finally {
        await runtime.dispose();
      }
    });
  });

  describe("findNFTValuation", () => {
    test("should find valuation by token code", async () => {
      const runtime = ManagedRuntime.make(NFTValuationServiceLive);
      try {
        const service = await runtime.runPromise(NFTValuationServiceTag);

        const valuations = [
          {
            tokenCode: "NFT1",
            valueInEURMTL: "1000",
            sourceAccount: "GCOJHUKGHI6IATN7AIEK4PSNBPXIAIZ7KB2AWTTUCNIAYVPUB2DMCITY",
          },
          {
            tokenCode: "NFT2",
            valueInEURMTL: "2000",
            sourceAccount: "GCOJHUKGHI6IATN7AIEK4PSNBPXIAIZ7KB2AWTTUCNIAYVPUB2DMCITY",
          },
        ];

        const found = service.findNFTValuation("NFT1", valuations);
        expect(found).not.toBeNull();
        expect(found?.tokenCode).toBe("NFT1");
        expect(found?.valueInEURMTL).toBe("1000");
      } finally {
        await runtime.dispose();
      }
    });

    test("should return null for non-existent token", async () => {
      const runtime = ManagedRuntime.make(NFTValuationServiceLive);
      try {
        const service = await runtime.runPromise(NFTValuationServiceTag);

        const valuations = [
          {
            tokenCode: "NFT1",
            valueInEURMTL: "1000",
            sourceAccount: "GCOJHUKGHI6IATN7AIEK4PSNBPXIAIZ7KB2AWTTUCNIAYVPUB2DMCITY",
          },
        ];

        const found = service.findNFTValuation("NFT_NOT_EXISTS", valuations);
        expect(found).toBeNull();
      } finally {
        await runtime.dispose();
      }
    });

    test("should return null for empty valuations array", async () => {
      const runtime = ManagedRuntime.make(NFTValuationServiceLive);
      try {
        const service = await runtime.runPromise(NFTValuationServiceTag);
        const found = service.findNFTValuation("NFT1", []);
        expect(found).toBeNull();
      } finally {
        await runtime.dispose();
      }
    });
  });

  describe("getNFTValuations", () => {
    // Note: This test requires real Stellar network access
    // In a real scenario, you would mock the loadAccount function
    // For now, this is a placeholder showing the test structure

    test.skip("should fetch NFT valuations from CITY account (integration test)", async () => {
      const runtime = ManagedRuntime.make(NFTValuationServiceLive);
      try {
        const service = await runtime.runPromise(NFTValuationServiceTag);

        const accountId = "GCOJHUKGHI6IATN7AIEK4PSNBPXIAIZ7KB2AWTTUCNIAYVPUB2DMCITY";
        const result = await runtime.runPromise(
          service.getNFTValuations(accountId),
        );

        // Verify structure
        expect(Array.isArray(result)).toBe(true);

        // If there are valuations, check their structure
        if (result.length > 0) {
          const valuation = result[0];
          if (valuation !== undefined) {
            expect(valuation).toHaveProperty("tokenCode");
            expect(valuation).toHaveProperty("valueInEURMTL");
            expect(valuation).toHaveProperty("sourceAccount");
            expect(valuation.sourceAccount).toBe(accountId);
          }
        }
      } finally {
        await runtime.dispose();
      }
    });
  });
});
