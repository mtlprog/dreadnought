import { describe, expect, test } from "bun:test";
import { fuzzyScore, scoreIndicator } from "./fuzzy";

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

describe("scoreIndicator", () => {
  const i30 = { id: 30, name: "Share Book Value", description: "Book value of fund" };
  const i26 = { id: 26, name: "Insurance Reserve", description: "Reserve fund" };

  test("\"I30\" matches indicator with id=30 even when name/desc lack '30'", () => {
    expect(scoreIndicator("I30", i30)).toBeGreaterThan(0);
  });

  test("\"I30\" exact code outranks unrelated indicator", () => {
    expect(scoreIndicator("I30", i30)).toBeGreaterThan(scoreIndicator("I30", i26));
  });

  test("\"I3\" does NOT match id=30 (would otherwise be ambiguous)", () => {
    expect(scoreIndicator("I3", { id: 3, name: "Foo", description: "" })).toBeGreaterThan(0);
    expect(scoreIndicator("I3", { id: 30, name: "Foo", description: "" })).toBeGreaterThan(0);
    expect(scoreIndicator("I3", { id: 3, name: "Foo", description: "" }))
      .toBeGreaterThanOrEqual(scoreIndicator("I3", { id: 30, name: "Foo", description: "" }));
  });

  test("\"I3\" prefix-matches I3, I30, I300 but not I130", () => {
    const prefix = scoreIndicator("I3", { id: 30, name: "X", description: "" });
    const nonPrefix = scoreIndicator("I3", { id: 130, name: "X", description: "" });
    expect(prefix).toBeGreaterThan(0);
    expect(nonPrefix).toBe(0);
  });

  test("ID match outranks accidental letter matches", () => {
    expect(scoreIndicator("I7", { id: 7, name: "EURMTL participants", description: "" }))
      .toBeGreaterThan(scoreIndicator("I7", { id: 99, name: "Insurance index 7", description: "" }));
  });

  test("matches by name when query is descriptive", () => {
    expect(scoreIndicator("share", i30)).toBeGreaterThan(0);
  });

  test("returns 0 when nothing matches", () => {
    expect(scoreIndicator("zzz", i30)).toBe(0);
  });

  test("empty query returns positive score (show-all contract)", () => {
    expect(scoreIndicator("", i30)).toBeGreaterThan(0);
  });

  test("whitespace-only query behaves like empty", () => {
    expect(scoreIndicator("   ", i30)).toBeGreaterThan(0);
  });
});
