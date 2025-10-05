import { describe, expect, test } from "bun:test";
import { formatNumber } from "./format";

describe("formatNumber", () => {
  test("should format large numbers with default 2 decimals", () => {
    expect(formatNumber(1234567.89)).toBe("1\u202F234\u202F567.89");
  });

  test("should format numbers with custom decimals", () => {
    expect(formatNumber(1234.5678, 7)).toBe("1\u202F234.5678000");
    expect(formatNumber(1234567, 0)).toBe("1\u202F234\u202F567");
    expect(formatNumber(1234.5, 4)).toBe("1\u202F234.5000");
  });

  test("should handle small numbers without separators", () => {
    expect(formatNumber(123.45, 2)).toBe("123.45");
    expect(formatNumber(99.99, 2)).toBe("99.99");
  });

  test("should handle zero", () => {
    expect(formatNumber(0, 2)).toBe("0.00");
    expect(formatNumber(0, 0)).toBe("0");
  });

  test("should handle negative numbers", () => {
    expect(formatNumber(-1234567.89, 2)).toBe("-1\u202F234\u202F567.89");
    expect(formatNumber(-123.45, 2)).toBe("-123.45");
  });

  test("should handle numbers at thousand boundary", () => {
    expect(formatNumber(999, 2)).toBe("999.00");
    expect(formatNumber(1000, 2)).toBe("1\u202F000.00");
    expect(formatNumber(999999, 2)).toBe("999\u202F999.00");
    expect(formatNumber(1000000, 2)).toBe("1\u202F000\u202F000.00");
  });

  test("should round numbers correctly", () => {
    expect(formatNumber(1234.5678, 2)).toBe("1\u202F234.57");
    expect(formatNumber(1234.5644, 2)).toBe("1\u202F234.56");
  });

  test("should handle very large numbers", () => {
    expect(formatNumber(1234567890.12, 2)).toBe("1\u202F234\u202F567\u202F890.12");
  });

  test("should use thin space (U+202F) separator", () => {
    const result = formatNumber(1234567.89, 2);
    expect(result).toContain("\u202F");
    expect(result).not.toContain(" "); // Regular space
    expect(result).not.toContain(","); // Comma separator
  });
});
