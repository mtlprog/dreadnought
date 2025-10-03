import { Asset } from "@stellar/stellar-sdk";
import { describe, expect, test } from "bun:test";
import { type AssetInfo, assetToInfo, createAsset, formatAssetDisplay, parseAssetString } from "./asset";

describe("Asset Utilities", () => {
  const testAssetInfo: AssetInfo = {
    code: "EURMTL",
    issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
    type: "credit_alphanum4",
  };

  describe("createAsset", () => {
    test("should create native asset", () => {
      const assetInfo: AssetInfo = {
        code: "XLM",
        issuer: "",
        type: "native",
      };

      const asset = createAsset(assetInfo);
      expect(asset.isNative()).toBe(true);
    });

    test("should create credit asset", () => {
      const asset = createAsset(testAssetInfo);
      expect(asset.code).toBe("EURMTL");
      expect(asset.issuer).toBe("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
    });
  });

  describe("parseAssetString", () => {
    test("should parse native asset", () => {
      const asset = parseAssetString("XLM");
      expect(asset.code).toBe("XLM");
      expect(asset.issuer).toBe("");
      expect(asset.type).toBe("native");
    });

    test("should parse credit_alphanum4 asset", () => {
      const asset = parseAssetString(
        "MTL:GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
      );
      expect(asset.code).toBe("MTL");
      expect(asset.issuer).toBe("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
      expect(asset.type).toBe("credit_alphanum4");
    });

    test("should parse credit_alphanum12 asset", () => {
      const asset = parseAssetString(
        "LONGERCODE:GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
      );
      expect(asset.code).toBe("LONGERCODE");
      expect(asset.issuer).toBe("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
      expect(asset.type).toBe("credit_alphanum12");
    });

    test("should throw on invalid format", () => {
      expect(() => parseAssetString("INVALID")).toThrow("Invalid asset string format");
    });
  });

  describe("formatAssetDisplay", () => {
    test("should format native asset", () => {
      const assetInfo: AssetInfo = {
        code: "XLM",
        issuer: "",
        type: "native",
      };

      expect(formatAssetDisplay(assetInfo)).toBe("XLM");
      expect(formatAssetDisplay(assetInfo, true)).toBe("XLM");
    });

    test("should format credit asset without issuer", () => {
      expect(formatAssetDisplay(testAssetInfo)).toBe("EURMTL");
    });

    test("should format credit asset with issuer", () => {
      const formatted = formatAssetDisplay(testAssetInfo, true);
      expect(formatted).toContain("EURMTL");
      expect(formatted).toContain("GA...");
      expect(formatted).toContain("UK7V");
    });
  });

  describe("assetToInfo", () => {
    test("should convert native asset", () => {
      const asset = Asset.native();
      const assetInfo = assetToInfo(asset);

      expect(assetInfo.code).toBe("XLM");
      expect(assetInfo.issuer).toBe("");
      expect(assetInfo.type).toBe("native");
    });

    test("should convert credit_alphanum4 asset", () => {
      const asset = new Asset(
        "MTL",
        "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
      );
      const assetInfo = assetToInfo(asset);

      expect(assetInfo.code).toBe("MTL");
      expect(assetInfo.issuer).toBe("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
      expect(assetInfo.type).toBe("credit_alphanum4");
    });

    test("should convert credit_alphanum12 asset", () => {
      const asset = new Asset(
        "LONGERCODE",
        "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
      );
      const assetInfo = assetToInfo(asset);

      expect(assetInfo.code).toBe("LONGERCODE");
      expect(assetInfo.issuer).toBe("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
      expect(assetInfo.type).toBe("credit_alphanum12");
    });
  });
});
