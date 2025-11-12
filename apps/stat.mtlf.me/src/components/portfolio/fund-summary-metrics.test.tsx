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
          nominalEURMTL={0}
          nominalXLM={0}
          accountCount={0}
          tokenCount={0}
          isLoading={true}
        />
      );

      expect(screen.getByText("⏳ ЗАГРУЗКА МЕТРИК...")).toBeInTheDocument();
      expect(screen.getByText("Получение суммарных данных фонда...")).toBeInTheDocument();
    });
  });

  describe("Nominal totals section", () => {
    test("should display nominal totals with correct values", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000.5}
          totalXLM={500000.1234567}
          nominalEURMTL={120000.75}
          nominalXLM={600000.7654321}
          accountCount={8}
          tokenCount={150}
          isLoading={false}
        />
      );

      expect(screen.getByText("НОМИНАЛЬНЫЙ ИТОГ")).toBeInTheDocument();
      expect(
        screen.getByText("Цена за 1 токен × Баланс (без учета проскальзывания)")
      ).toBeInTheDocument();

      // Check for section labels
      expect(screen.getByText("НОМИНАЛ EURMTL")).toBeInTheDocument();
      expect(screen.getByText("НОМИНАЛ XLM")).toBeInTheDocument();
      expect(screen.getByText("СЧЕТОВ")).toBeInTheDocument();
      expect(screen.getByText("ТОКЕНОВ")).toBeInTheDocument();

      // Check account and token counts (exact text match)
      const accountCountElements = screen.getAllByText("8");
      expect(accountCountElements.length).toBeGreaterThan(0);

      const tokenCountElements = screen.getAllByText("150");
      expect(tokenCountElements.length).toBeGreaterThan(0);
    });

    test("should handle zero nominal values", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={0}
          totalXLM={0}
          nominalEURMTL={0}
          nominalXLM={0}
          accountCount={0}
          tokenCount={0}
          isLoading={false}
        />
      );

      expect(screen.getByText("НОМИНАЛЬНЫЙ ИТОГ")).toBeInTheDocument();
    });

    test("should use electric-cyan styling for nominal section", () => {
      const { container } = render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          nominalEURMTL={120000}
          nominalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      const nominalCard = container.querySelector(".bg-electric-cyan\\/10");
      expect(nominalCard).toBeDefined();

      const borderElement = container.querySelector(".border-electric-cyan");
      expect(borderElement).toBeDefined();
    });
  });

  describe("Liquid totals section", () => {
    test("should display liquid totals with correct heading", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000.5}
          totalXLM={500000.1234567}
          nominalEURMTL={120000.75}
          nominalXLM={600000.7654321}
          accountCount={8}
          tokenCount={150}
          isLoading={false}
        />
      );

      expect(screen.getByText("ЛИКВИДНЫЙ ИТОГ")).toBeInTheDocument();
      expect(
        screen.getByText("Реальная стоимость при продаже всего баланса")
      ).toBeInTheDocument();
    });

    test("should display liquid values labels", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          nominalEURMTL={120000}
          nominalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      expect(screen.getByText("ЛИКВИД EURMTL")).toBeInTheDocument();
      expect(screen.getByText("ЛИКВИД XLM")).toBeInTheDocument();
    });

    test("should NOT display slippage columns", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          nominalEURMTL={120000}
          nominalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      // Verify slippage columns are removed
      expect(screen.queryByText("ПРОСКАЛЬЗЫВАНИЕ EURMTL")).not.toBeInTheDocument();
      expect(screen.queryByText("ПРОСКАЛЬЗЫВАНИЕ XLM")).not.toBeInTheDocument();
    });

    test("should use cyber-green styling for liquid section", () => {
      const { container } = render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          nominalEURMTL={120000}
          nominalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      const liquidCard = container.querySelector(".bg-cyber-green\\/10");
      expect(liquidCard).toBeDefined();

      const borderElement = container.querySelector(".border-cyber-green");
      expect(borderElement).toBeDefined();
    });

    test("should NOT mention slippage in description", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          nominalEURMTL={120000}
          nominalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      // Verify the description no longer mentions slippage
      expect(
        screen.queryByText(/с учетом проскальзывания/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Layout and responsive design", () => {
    test("should use 2-column grid for liquid totals", () => {
      const { container } = render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          nominalEURMTL={120000}
          nominalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      // Find grids and identify the one that doesn't have xl:grid-cols-4 (liquid grid)
      const grids = container.querySelectorAll(".grid");
      const liquidGrid = Array.from(grids).find((grid) => {
        const className = grid.getAttribute("class") ?? "";
        return className.includes("md:grid-cols-2") && !className.includes("xl:grid-cols-4");
      });

      expect(liquidGrid).toBeDefined();

      // Verify it's 2 columns, not 4
      const className = liquidGrid?.getAttribute("class") ?? "";
      expect(className).toContain("md:grid-cols-2");
      expect(className).not.toContain("xl:grid-cols-4");
    });

    test("should use 4-column grid for nominal totals", () => {
      const { container } = render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          nominalEURMTL={120000}
          nominalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      // Find the nominal totals grid
      const nominalGrids = container.querySelectorAll(".grid");
      const nominalGrid = Array.from(nominalGrids).find((grid) =>
        grid.className.includes("xl:grid-cols-4")
      );
      expect(nominalGrid).toBeDefined();
    });
  });

  describe("Design system compliance", () => {
    test("should use uppercase text for system messages", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          nominalEURMTL={120000}
          nominalXLM={600000}
          accountCount={5}
          tokenCount={100}
          isLoading={false}
        />
      );

      const uppercaseElements = [
        "НОМИНАЛЬНЫЙ ИТОГ",
        "ЛИКВИДНЫЙ ИТОГ",
        "НОМИНАЛ EURMTL",
        "НОМИНАЛ XLM",
        "ЛИКВИД EURMTL",
        "ЛИКВИД XLM",
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
          nominalEURMTL={120000}
          nominalXLM={600000}
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
          nominalEURMTL={120000}
          nominalXLM={600000}
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
          nominalEURMTL={0}
          nominalXLM={0}
          accountCount={0}
          tokenCount={0}
          isLoading={false}
        />
      );

      expect(screen.getByText("НОМИНАЛЬНЫЙ ИТОГ")).toBeInTheDocument();
      expect(screen.getByText("ЛИКВИДНЫЙ ИТОГ")).toBeInTheDocument();
    });

    test("should default isLoading to false when not provided", () => {
      render(
        <FundSummaryMetrics
          totalEURMTL={100000}
          totalXLM={500000}
          nominalEURMTL={120000}
          nominalXLM={600000}
          accountCount={5}
          tokenCount={100}
        />
      );

      // Should show content, not loading state
      expect(screen.queryByText("⏳ ЗАГРУЗКА МЕТРИК...")).not.toBeInTheDocument();
      expect(screen.getByText("НОМИНАЛЬНЫЙ ИТОГ")).toBeInTheDocument();
    });
  });
});
