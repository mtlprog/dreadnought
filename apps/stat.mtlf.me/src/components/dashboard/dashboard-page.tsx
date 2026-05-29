"use client";

import { useIndicatorHistory } from "@/hooks/use-indicator-history";
import { useIndicators } from "@/hooks/use-indicators";
import { useSubfundBalance } from "@/hooks/use-subfund-balance";
import type { Range } from "@/lib/api/types";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { IndicatorComparisonChart } from "./indicator-comparison-chart";
import { IndicatorHistoryChart } from "./indicator-history-chart";
import { IndicatorsGrid } from "./indicators-grid";
import { RangeSelector } from "./range-selector";
import { SubfundPieChart } from "./subfund-pie-chart";

const KEY_INDICATORS: readonly { id: number; name: string }[] = [
  { id: 1, name: "Market Cap EUR" },
  { id: 3, name: "Assets Value MTLF" },
  { id: 4, name: "Operating Balance" },
  { id: 17, name: "Annual Dividend Yield 2" },
  { id: 24, name: "EURMTL Participants" },
  { id: 27, name: "More-one-share Shareholders" },
  { id: 51, name: "DEFI Total Value" },
  { id: 52, name: "MCITY Total Value" },
  { id: 53, name: "MABIZ Total Value" },
];

const COMPARISON = {
  marketId: 10,
  bookId: 8,
  marketName: "Share Market Price",
  bookName: "Share Book Value",
} as const;

const COMPARISON_INSERT_AFTER = 4;

const KEY_IDS = [
  ...KEY_INDICATORS.map((k) => k.id),
  COMPARISON.marketId,
  COMPARISON.bookId,
];
const TOTAL_INDICATOR_ID = 3;

export function DashboardPage() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const { data: subfundData, isLoading: subfundLoading, error: subfundError } = useSubfundBalance(date);
  const { data: indicators, isLoading: indicatorsLoading, error: indicatorsError } = useIndicators(date);
  const [range, setRange] = useState<Range>("90d");
  const { series, isLoading: historyLoading, error: historyError } = useIndicatorHistory(KEY_IDS, range);

  const fundHref = date !== null ? `/fund?date=${encodeURIComponent(date)}` : "/fund";

  const seriesById = useMemo(() => {
    const map = new Map(series.map((s) => [s.id, s]));
    if (date === null) return map;
    return new Map(
      [...map.entries()].map(([id, s]) => [
        id,
        { ...s, points: s.points.filter((p) => (p.date.split("T")[0] ?? p.date) <= date) },
      ]),
    );
  }, [series, date]);

  const totalIndicator = indicators.find((i) => i.id === TOTAL_INDICATOR_ID);

  const renderHistoryChart = (kpi: { id: number; name: string }) => (
    <IndicatorHistoryChart
      key={kpi.id}
      id={kpi.id}
      fallbackName={kpi.name}
      series={seriesById.get(kpi.id)}
      isLoading={historyLoading}
      error={historyError}
    />
  );

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <section>
        {subfundError !== null && (
          <div className="border border-red-500 bg-red-500/10 p-6 font-mono text-sm text-red-400">
            SUBFUND LOAD ERROR: {subfundError}
          </div>
        )}
        {subfundError === null && subfundLoading && (
          <div className="h-[480px] border border-cyber-green/30 bg-steel-gray/10 animate-pulse" />
        )}
        {subfundError === null && !subfundLoading && subfundData !== null && (
          <SubfundPieChart
            slices={subfundData.slices}
            date={subfundData.date}
            fundHref={fundHref}
            {...(totalIndicator !== undefined
              ? { totalValue: totalIndicator.value, totalUnit: totalIndicator.unit }
              : {})}
          />
        )}
      </section>

      <IndicatorsGrid
        data={indicators}
        isLoading={indicatorsLoading}
        error={indicatorsError}
      />

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-mono text-xl uppercase tracking-wider text-cyber-green">
            KEY METRICS HISTORY
          </h2>
          <RangeSelector value={range} onChange={setRange} />
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {KEY_INDICATORS.slice(0, COMPARISON_INSERT_AFTER).map(renderHistoryChart)}
          <div className="lg:col-span-2">
            <IndicatorComparisonChart
              marketId={COMPARISON.marketId}
              bookId={COMPARISON.bookId}
              marketFallbackName={COMPARISON.marketName}
              bookFallbackName={COMPARISON.bookName}
              marketSeries={seriesById.get(COMPARISON.marketId)}
              bookSeries={seriesById.get(COMPARISON.bookId)}
              isLoading={historyLoading}
              error={historyError}
            />
          </div>
          {KEY_INDICATORS.slice(COMPARISON_INSERT_AFTER).map(renderHistoryChart)}
        </div>
      </section>
    </div>
  );
}
