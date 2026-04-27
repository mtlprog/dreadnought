import { describe, expect, test } from "bun:test";
import { fuzzyScore } from "./fuzzy";

describe("fuzzyScore", () => {
  test("empty query returns 1 (show-everything contract)", () => {
    expect(fuzzyScore("", "anything")).toBe(1);
    expect(fuzzyScore("", "")).toBe(1);
  });

  test("non-subsequence returns 0", () => {
    expect(fuzzyScore("xyz", "abcdef")).toBe(0);
    expect(fuzzyScore("abz", "abc")).toBe(0);
  });

  test("partial match where last query char missing returns 0", () => {
    expect(fuzzyScore("abcd", "abc")).toBe(0);
  });

  test("is case-insensitive", () => {
    expect(fuzzyScore("ABC", "abcdef")).toBeGreaterThan(0);
    expect(fuzzyScore("abc", "ABCDEF")).toBe(fuzzyScore("ABC", "abcdef"));
  });

  test("contiguous match scores higher than scattered match", () => {
    expect(fuzzyScore("abc", "abc")).toBeGreaterThan(fuzzyScore("abc", "axbxc"));
  });

  test("non-empty query into empty text returns 0", () => {
    expect(fuzzyScore("a", "")).toBe(0);
  });
});
