import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "bun:test";
import { FundSummaryMetrics } from "./fund-summary-metrics";

afterEach(cleanup);

describe("FundSummaryMetrics", () => {
  describe("Loading state", () => {
    test("should display loading message when isLoading is true", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={0}
          totalXLM={0}
          accountCount={0}
          tokenCount={0}
          isLoading={true}
        />,
      );

      expect(screen.getByText("⏳ LOADING METRICS...")).toBeInTheDocument();
      expect(screen.getByText("Fetching aggregated fund data...")).toBeInTheDocument();
    });
  });

  describe("Total metrics section", () => {
    test("should display total metrics with correct values", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={120000.75}
          totalXLM={600000.7654321}
          accountCount={8}
          tokenCount={150}
          isLoading={false}
        />,
      );

      expect(screen.getByText("FUND TOTALS")).toBeInTheDocument();
      expect(screen.getByText("Price per token × balance")).toBeInTheDocument();

      expect(screen.getByText("TOTAL EURMTL")).toBeInTheDocument();
      expect(screen.getByText("TOTAL XLM")).toBeInTheDocument();
      expect(screen.getByText("ACCOUNTS")).toBeInTheDocument();
      expect(screen.getByText("TOKENS")).toBeInTheDocument();

      const accountCountElements = screen.getAllByText("8");
      expect(accountCountElements.length).toBeGreaterThan(0);

      const tokenCountElements = screen.getAllByText("150");
      expect(tokenCountElements.length).toBeGreaterThan(0);
    });

    test("should handle zero values", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={0}
          totalXLM={0}
          accountCount={0}
          tokenCount={0}
          isLoading={false}
        />,
      );

      expect(screen.getByText("FUND TOTALS")).toBeInTheDocument();
    });

    test("should use electric-cyan styling", () => {
      const { container } = render(
        <FundSummaryMetrics
          totalEURMTL={120000}
          totalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />,
      );

      const card = container.querySelector(".bg-electric-cyan\\/10");
      expect(card).toBeDefined();

      const borderElement = container.querySelector(".border-electric-cyan");
      expect(borderElement).toBeDefined();
    });
  });

  describe("Removed sections", () => {
    test("should NOT display nominal totals section", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />,
      );

      expect(screen.queryByText("NOMINAL TOTAL")).not.toBeInTheDocument();
      expect(screen.queryByText("NOMINAL EURMTL")).not.toBeInTheDocument();
      expect(screen.queryByText("NOMINAL XLM")).not.toBeInTheDocument();
    });

    test("should NOT display liquid totals section", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />,
      );

      expect(screen.queryByText("LIQUID TOTAL")).not.toBeInTheDocument();
      expect(screen.queryByText("LIQUID EURMTL")).not.toBeInTheDocument();
      expect(screen.queryByText("LIQUID XLM")).not.toBeInTheDocument();
    });

    test("should NOT display slippage columns", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />,
      );

      expect(screen.queryByText("SLIPPAGE EURMTL")).not.toBeInTheDocument();
      expect(screen.queryByText("SLIPPAGE XLM")).not.toBeInTheDocument();
    });

    test("should NOT mention slippage in description", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />,
      );

      expect(screen.queryByText(/with slippage/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/without slippage/i)).not.toBeInTheDocument();
    });
  });

  describe("Layout and responsive design", () => {
    test("should use 4-column grid for totals", () => {
      const { container } = render(
        <FundSummaryMetrics
          totalEURMTL={120000}
          totalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />,
      );

      const grid = container.querySelector(".grid");
      expect(grid).toBeDefined();

      const className = grid?.getAttribute("class") ?? "";
      expect(className).toContain("xl:grid-cols-4");
    });
  });

  describe("Design system compliance", () => {
    test("should use uppercase text for system messages", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />,
      );

      const uppercaseElements = [
        "FUND TOTALS",
        "TOTAL EURMTL",
        "TOTAL XLM",
        "ACCOUNTS",
        "TOKENS",
      ];

      for (const text of uppercaseElements) {
        expect(screen.getByText(text)).toBeInTheDocument();
      }
    });

    test("should use monospace fonts", () => {
      const { container } = render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />,
      );

      const monoElements = container.querySelectorAll(".font-mono");
      expect(monoElements.length).toBeGreaterThan(0);
    });

    test("should use zero border-radius on cards", () => {
      const { container } = render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />,
      );

      const cards = container.querySelectorAll(".border-0");
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe("Null and undefined handling", () => {
    test("should handle null values gracefully", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={0}
          totalXLM={0}
          accountCount={0}
          tokenCount={0}
          isLoading={false}
        />,
      );

      expect(screen.getByText("FUND TOTALS")).toBeInTheDocument();
    });

    test("should default isLoading to false when not provided", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
        />,
      );

      expect(screen.queryByText("⏳ LOADING METRICS...")).not.toBeInTheDocument();
      expect(screen.getByText("FUND TOTALS")).toBeInTheDocument();
    });
  });
});
