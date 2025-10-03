import { describe, expect, test } from "bun:test";
import {
  formatAccountIdForDisplay,
  isValidStellarAccountId,
  truncateAccountId,
} from "./account";

describe("Account Utilities", () => {
  const validAccountId = "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V";
  const invalidAccountId = "invalid";

  describe("isValidStellarAccountId", () => {
    test("should validate correct account ID", () => {
      expect(isValidStellarAccountId(validAccountId)).toBe(true);
    });

    test("should reject invalid account ID", () => {
      expect(isValidStellarAccountId(invalidAccountId)).toBe(false);
      expect(isValidStellarAccountId("")).toBe(false);
      expect(isValidStellarAccountId("AAAA")).toBe(false);
    });

    test("should reject account ID with wrong prefix", () => {
      expect(isValidStellarAccountId("AACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V")).toBe(
        false,
      );
    });

    test("should reject account ID with wrong length", () => {
      expect(isValidStellarAccountId("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK")).toBe(
        false,
      );
    });
  });

  describe("truncateAccountId", () => {
    test("should truncate with default parameters", () => {
      const truncated = truncateAccountId(validAccountId);
      expect(truncated).toBe("GA...X2UK7V");
    });

    test("should truncate with custom parameters", () => {
      const truncated = truncateAccountId(validAccountId, 4, 4);
      expect(truncated).toBe("GACK...UK7V");
    });

    test("should not truncate short strings", () => {
      const shortId = "GACKTN";
      expect(truncateAccountId(shortId)).toBe(shortId);
    });
  });

  describe("formatAccountIdForDisplay", () => {
    test("should format with default options", () => {
      const formatted = formatAccountIdForDisplay(validAccountId);
      expect(formatted).toBe("GA...X2UK7V");
    });

    test("should format without truncation", () => {
      const formatted = formatAccountIdForDisplay(validAccountId, { truncate: false });
      expect(formatted).toBe(validAccountId);
    });

    test("should validate and reject invalid account ID", () => {
      const formatted = formatAccountIdForDisplay(invalidAccountId, { validate: true });
      expect(formatted).toBe("Invalid account ID");
    });

    test("should format with custom truncation", () => {
      const formatted = formatAccountIdForDisplay(validAccountId, {
        prefixLength: 4,
        suffixLength: 4,
      });
      expect(formatted).toBe("GACK...UK7V");
    });

    test("should not validate by default", () => {
      const formatted = formatAccountIdForDisplay(invalidAccountId);
      expect(formatted).not.toBe("Invalid account ID");
    });
  });
});
