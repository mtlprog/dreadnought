import type { DecimalString, IndicatorPoint, IndicatorSeries } from "@/lib/api/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "bun:test";
import { IndicatorComparisonChart } from "./indicator-comparison-chart";

afterEach(cleanup);

const dec = (s: string): DecimalString => s as DecimalString;

const point = (date: string, value: string): IndicatorPoint => ({
  date,
  value: dec(value),
});

const series = (overrides: Partial<IndicatorSeries> & Pick<IndicatorSeries, "id">): IndicatorSeries => ({
  id: overrides.id,
  name: overrides.name ?? `Series ${overrides.id}`,
  unit: overrides.unit ?? "EURMTL",
  points: overrides.points ?? [],
});

const baseProps = {
  marketId: 10,
  bookId: 8,
  marketFallbackName: "Share Market Price",
  bookFallbackName: "Share Book Value",
  marketSeries: undefined,
  bookSeries: undefined,
  isLoading: false,
  error: null,
};

describe("IndicatorComparisonChart", () => {
  test("renders id pair and title", () => {
    render(<IndicatorComparisonChart {...baseProps} />);
    expect(screen.getByText("I10/I8")).toBeDefined();
    expect(screen.getByText("MARKET vs BOOK")).toBeDefined();
  });

  test("uses fallback names when series are absent", () => {
    render(<IndicatorComparisonChart {...baseProps} />);
    expect(screen.getByText("Share Market Price")).toBeDefined();
    expect(screen.getByText("Share Book Value")).toBeDefined();
  });

  test("uses series names when provided", () => {
    render(
      <IndicatorComparisonChart
        {...baseProps}
        marketSeries={series({ id: 10, name: "Market Live" })}
        bookSeries={series({ id: 8, name: "Book Live" })}
      />,
    );
    expect(screen.getByText("Market Live")).toBeDefined();
    expect(screen.getByText("Book Live")).toBeDefined();
  });

  test("shows ERROR state when error is set", () => {
    render(<IndicatorComparisonChart {...baseProps} error="boom" />);
    expect(screen.getByText("ERROR: boom")).toBeDefined();
  });

  test("shows LOADING when isLoading is true and no error", () => {
    render(<IndicatorComparisonChart {...baseProps} isLoading />);
    expect(screen.getByText("LOADING…")).toBeDefined();
  });

  test("shows NO DATA when both series are empty", () => {
    render(
      <IndicatorComparisonChart
        {...baseProps}
        marketSeries={series({ id: 10 })}
        bookSeries={series({ id: 8 })}
      />,
    );
    expect(screen.getByText("NO DATA")).toBeDefined();
  });

  test("renders premium spread with cyber-green tone when market > book", () => {
    render(
      <IndicatorComparisonChart
        {...baseProps}
        marketSeries={series({
          id: 10,
          points: [point("2025-01-01", "5.00"), point("2025-01-02", "6.00")],
        })}
        bookSeries={series({
          id: 8,
          points: [point("2025-01-01", "4.00"), point("2025-01-02", "5.00")],
        })}
      />,
    );
    const spread = screen.getByText("+20.00%");
    expect(spread.className).toContain("text-cyber-green");
    expect(screen.getByText("PREMIUM").className).toContain("text-cyber-green");
  });

  test("renders discount spread with red tone when market < book", () => {
    render(
      <IndicatorComparisonChart
        {...baseProps}
        marketSeries={series({
          id: 10,
          points: [point("2025-01-01", "4.00")],
        })}
        bookSeries={series({
          id: 8,
          points: [point("2025-01-01", "5.00")],
        })}
      />,
    );
    const spread = screen.getByText("-20.00%");
    expect(spread.className).toContain("text-red-400");
    expect(screen.getByText("DISCOUNT").className).toContain("text-red-400");
  });

  test("does not render spread when one of the series is missing", () => {
    render(
      <IndicatorComparisonChart
        {...baseProps}
        marketSeries={series({ id: 10, points: [point("2025-01-01", "5.00")] })}
      />,
    );
    expect(screen.queryByText("PREMIUM")).toBeNull();
    expect(screen.queryByText("DISCOUNT")).toBeNull();
  });

  test("uses last defined value, ignoring null/non-finite tails", () => {
    render(
      <IndicatorComparisonChart
        {...baseProps}
        marketSeries={series({
          id: 10,
          points: [point("2025-01-01", "5.00"), point("2025-01-02", "not-a-number")],
        })}
        bookSeries={series({
          id: 8,
          points: [point("2025-01-01", "4.00"), point("2025-01-02", "4.00")],
        })}
      />,
    );
    expect(screen.getByText("PREMIUM")).toBeDefined();
    expect(screen.getByText("+25.00%")).toBeDefined();
  });
});
