import { describe, expect, test } from "bun:test";
import { ApiShapeError } from "./client";
import { __test__ } from "./snapshots";

const { adaptSnapshot, parseRequiredNumber } = __test__;

const path = "/api/v1/snapshots/latest";

const baseAccount = {
  id: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
  name: "MAIN",
  type: "issuer" as const,
  description: "x",
  tokens: [],
  xlmBalance: "0",
  xlmPriceInEURMTL: null,
};

describe("parseRequiredNumber", () => {
  test("parses numeric string", () => {
    expect(parseRequiredNumber("1234.56", "f", path)).toBe(1234.56);
  });
  test("passes through finite number", () => {
    expect(parseRequiredNumber(7, "f", path)).toBe(7);
  });
  test("throws on null", () => {
    expect(() => parseRequiredNumber(null, "f", path)).toThrow(ApiShapeError);
  });
  test("throws on undefined", () => {
    expect(() => parseRequiredNumber(undefined, "f", path)).toThrow(ApiShapeError);
  });
  test("throws on non-numeric string", () => {
    expect(() => parseRequiredNumber("abc", "f", path)).toThrow(ApiShapeError);
  });
  test("throws on NaN literal", () => {
    expect(() => parseRequiredNumber(NaN, "f", path)).toThrow(ApiShapeError);
  });
  test("throws on Infinity", () => {
    expect(() => parseRequiredNumber(Infinity, "f", path)).toThrow(ApiShapeError);
  });
});

describe("adaptSnapshot", () => {
  test("passes through accounts and otherAccounts; null aggregatedTotals when omitted", () => {
    const result = adaptSnapshot(
      {
        id: 1,
        entityId: 1,
        snapshotDate: "2026-04-26",
        data: {
          accounts: [{ ...baseAccount, totalEURMTL: "100", totalXLM: "10" }],
          otherAccounts: [{ ...baseAccount, name: "OTHER", totalEURMTL: "5", totalXLM: "0" }],
        },
      },
      path,
    );
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]?.totalEURMTL).toBe(100);
    expect(result.otherAccounts).toHaveLength(1);
    expect(result.otherAccounts[0]?.name).toBe("OTHER");
    expect(result.aggregatedTotals).toBeNull();
  });

  test("uses root.otherAccounts when data.otherAccounts is missing", () => {
    const result = adaptSnapshot(
      {
        id: 1,
        entityId: 1,
        snapshotDate: "2026-04-26",
        data: { accounts: [] },
        otherAccounts: [{ ...baseAccount, name: "ROOT", totalEURMTL: "1", totalXLM: "0" }],
      },
      path,
    );
    expect(result.otherAccounts).toHaveLength(1);
    expect(result.otherAccounts[0]?.name).toBe("ROOT");
  });

  test("normalizes aggregatedTotals from string numbers", () => {
    const result = adaptSnapshot(
      {
        id: 1,
        entityId: 1,
        snapshotDate: "2026-04-26",
        data: {
          accounts: [],
          aggregatedTotals: {
            totalEURMTL: "2823474.89170811528",
            totalXLM: "19624807.78601372450",
            accountCount: 6,
            tokenCount: 95,
          },
        },
      },
      path,
    );
    expect(result.aggregatedTotals).not.toBeNull();
    expect(result.aggregatedTotals?.totalEURMTL).toBe(2823474.89170811528);
    expect(result.aggregatedTotals?.accountCount).toBe(6);
    expect(result.aggregatedTotals?.tokenCount).toBe(95);
  });

  test("throws ApiShapeError when account total is non-finite", () => {
    expect(() =>
      adaptSnapshot(
        {
          id: 1,
          entityId: 1,
          snapshotDate: "2026-04-26",
          data: {
            accounts: [{ ...baseAccount, totalEURMTL: "not-a-number", totalXLM: "0" }],
          },
        },
        path,
      )
    ).toThrow(ApiShapeError);
  });

  test("throws ApiShapeError when envelope.data is missing", () => {
    expect(() =>
      adaptSnapshot(
        {
          id: 1,
          entityId: 1,
          snapshotDate: "2026-04-26",
          // @ts-expect-error testing invalid input
          data: null,
        },
        path,
      )
    ).toThrow(ApiShapeError);
  });
});
