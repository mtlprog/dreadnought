import { describe, expect, test } from "bun:test";
import { formatNumber } from "./utils";

describe("formatNumber", () => {
  test("should format integer with thousand separators", () => {
    expect(formatNumber(1234567, 2)).toBe("1\u202F234\u202F567.00");
  });

  test("should format decimal with thousand separators", () => {
    expect(formatNumber(1234567.89, 2)).toBe("1\u202F234\u202F567.89");
  });

  test("should handle 7 decimals", () => {
    expect(formatNumber(1234.5678901, 7)).toBe("1\u202F234.5678901");
  });

  test("should handle small numbers without thousand separators", () => {
    expect(formatNumber(123.45, 2)).toBe("123.45");
  });

  test("should handle zero", () => {
    expect(formatNumber(0, 2)).toBe("0.00");
  });

  test("should handle negative numbers", () => {
    expect(formatNumber(-1234567.89, 2)).toBe("-1\u202F234\u202F567.89");
  });

  test("should handle numbers with 4 decimals", () => {
    expect(formatNumber(1234.5678, 4)).toBe("1\u202F234.5678");
  });

  test("should handle very large numbers", () => {
    expect(formatNumber(1234567890.12, 2)).toBe("1\u202F234\u202F567\u202F890.12");
  });

  test("should pad decimals with zeros", () => {
    expect(formatNumber(100, 7)).toBe("100.0000000");
  });

  test("should handle numbers without thousand separator", () => {
    expect(formatNumber(999.99, 2)).toBe("999.99");
  });

  test("should handle exactly 1000", () => {
    expect(formatNumber(1000, 2)).toBe("1\u202F000.00");
  });
});
