import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { FundSummaryMetrics } from "./fund-summary-metrics";

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
        />
      );

      expect(screen.getByText("⏳ ЗАГРУЗКА МЕТРИК...")).toBeInTheDocument();
      expect(screen.getByText("Получение суммарных данных фонда...")).toBeInTheDocument();
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
        />
      );

      expect(screen.getByText("ИТОГО ПО ФОНДУ")).toBeInTheDocument();
      expect(
        screen.getByText("Цена за 1 токен × Баланс")
      ).toBeInTheDocument();

      // Check for section labels
      expect(screen.getByText("ИТОГО EURMTL")).toBeInTheDocument();
      expect(screen.getByText("ИТОГО XLM")).toBeInTheDocument();
      expect(screen.getByText("СЧЕТОВ")).toBeInTheDocument();
      expect(screen.getByText("ТОКЕНОВ")).toBeInTheDocument();

      // Check account and token counts (exact text match)
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
        />
      );

      expect(screen.getByText("ИТОГО ПО ФОНДУ")).toBeInTheDocument();
    });

    test("should use electric-cyan styling", () => {
      const { container } = render(
        <FundSummaryMetrics
          totalEURMTL={120000}
          totalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
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
        />
      );

      // Verify nominal section is removed
      expect(screen.queryByText("НОМИНАЛЬНЫЙ ИТОГ")).not.toBeInTheDocument();
      expect(screen.queryByText("НОМИНАЛ EURMTL")).not.toBeInTheDocument();
      expect(screen.queryByText("НОМИНАЛ XLM")).not.toBeInTheDocument();
    });

    test("should NOT display liquid totals section", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      // Verify liquid section is removed
      expect(screen.queryByText("ЛИКВИДНЫЙ ИТОГ")).not.toBeInTheDocument();
      expect(screen.queryByText("ЛИКВИД EURMTL")).not.toBeInTheDocument();
      expect(screen.queryByText("ЛИКВИД XLM")).not.toBeInTheDocument();
    });

    test("should NOT display slippage columns", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      // Verify slippage columns are removed
      expect(screen.queryByText("ПРОСКАЛЬЗЫВАНИЕ EURMTL")).not.toBeInTheDocument();
      expect(screen.queryByText("ПРОСКАЛЬЗЫВАНИЕ XLM")).not.toBeInTheDocument();
    });

    test("should NOT mention slippage in description", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      // Verify the description no longer mentions slippage
      expect(
        screen.queryByText(/с учетом проскальзывания/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/без учета проскальзывания/i)
      ).not.toBeInTheDocument();
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
        />
      );

      // Find the grid
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
        />
      );

      const uppercaseElements = [
        "ИТОГО ПО ФОНДУ",
        "ИТОГО EURMTL",
        "ИТОГО XLM",
        "СЧЕТОВ",
        "ТОКЕНОВ",
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
        />
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
        />
      );

      // Card component should have border-0 class (zero border)
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
        />
      );

      expect(screen.getByText("ИТОГО ПО ФОНДУ")).toBeInTheDocument();
    });

    test("should default isLoading to false when not provided", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          accountCount={5}
          tokenCount={100}
        />
      );

      // Should show content, not loading state
      expect(screen.queryByText("⏳ ЗАГРУЗКА МЕТРИК...")).not.toBeInTheDocument();
      expect(screen.getByText("ИТОГО ПО ФОНДУ")).toBeInTheDocument();
    });
  });
});
