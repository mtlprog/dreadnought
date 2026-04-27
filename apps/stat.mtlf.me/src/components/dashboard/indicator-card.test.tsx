import type { DecimalString, Indicator } from "@/lib/api/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "bun:test";
import { IndicatorCard } from "./indicator-card";

afterEach(cleanup);

const dec = (s: string): DecimalString => s as DecimalString;

const indicator = (overrides: Partial<Indicator> = {}): Indicator => ({
  id: 3,
  name: "Assets Value",
  description: "Total fund assets",
  unit: "EURMTL",
  value: dec("2823474.89"),
  ...overrides,
});

describe("IndicatorCard", () => {
  test("renders id, name, value, unit", () => {
    render(<IndicatorCard indicator={indicator()} />);
    expect(screen.getByText("I3")).toBeDefined();
    expect(screen.getByText("Assets Value")).toBeDefined();
    expect(screen.getByText("EURMTL")).toBeDefined();
  });

  test("renders positive change with + sign and cyber-green color", () => {
    render(
      <IndicatorCard
        indicator={indicator({ changes: { "30d": { abs: dec("100"), pct: dec("3.07") } } })}
      />,
    );
    const pct = screen.getByText("+3.07%");
    expect(pct.className).toContain("text-cyber-green");
  });

  test("renders negative change with red color and no leading +", () => {
    render(
      <IndicatorCard
        indicator={indicator({ changes: { "30d": { abs: dec("-50"), pct: dec("-1.50") } } })}
      />,
    );
    const pct = screen.getByText("-1.50%");
    expect(pct.className).toContain("text-red-400");
  });

  test("renders zero change with steel-gray and no leading +", () => {
    render(
      <IndicatorCard
        indicator={indicator({ changes: { "30d": { abs: dec("0"), pct: dec("0") } } })}
      />,
    );
    const pct = screen.getByText("0.00", { exact: false });
    expect(pct.className).toContain("text-steel-gray");
  });

  test("does not render changes block when changes prop missing", () => {
    render(<IndicatorCard indicator={indicator()} />);
    expect(screen.queryByText(/%$/)).toBeNull();
  });
});
