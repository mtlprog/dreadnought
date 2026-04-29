"use client";

import { useIndicatorHistory } from "@/hooks/use-indicator-history";
import { useIndicators } from "@/hooks/use-indicators";
import { useSubfundBalance } from "@/hooks/use-subfund-balance";
import type { Range } from "@/lib/api/types";
import { useState } from "react";
import { IndicatorHistoryChart } from "./indicator-history-chart";
import { IndicatorsGrid } from "./indicators-grid";
import { RangeSelector } from "./range-selector";
import { SubfundPieChart } from "./subfund-pie-chart";

const KEY_INDICATORS: readonly { id: number; name: string }[] = [
  { id: 3, name: "Assets Value MTLF" },
  { id: 4, name: "Operating Balance" },
  { id: 51, name: "DEFI Total Value" },
  { id: 52, name: "MCITY Total Value" },
  { id: 53, name: "MABIZ Total Value" },
];

const KEY_IDS = KEY_INDICATORS.map((k) => k.id);
const TOTAL_INDICATOR_ID = 3;

const KEY_INDICATOR_IDS: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 15, 16, 17, 18, 22, 24, 27, 30, 40,
];

export function DashboardPage() {
  const { data: subfundData, isLoading: subfundLoading, error: subfundError } = useSubfundBalance();
  const { data: indicators, isLoading: indicatorsLoading, error: indicatorsError } = useIndicators();
  const [range, setRange] = useState<Range>("90d");
  const { series, isLoading: historyLoading, error: historyError } = useIndicatorHistory(KEY_IDS, range);

  const seriesById = new Map(series.map((s) => [s.id, s]));
  const totalIndicator = indicators.find((i) => i.id === TOTAL_INDICATOR_ID);

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
            {...(totalIndicator !== undefined
              ? { totalValue: totalIndicator.value, totalUnit: totalIndicator.unit }
              : {})}
          />
        )}
      </section>

      <IndicatorsGrid
        data={indicators}
        keyIds={KEY_INDICATOR_IDS}
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
          {KEY_INDICATORS.map((kpi) => (
            <IndicatorHistoryChart
              key={kpi.id}
              id={kpi.id}
              fallbackName={kpi.name}
              series={seriesById.get(kpi.id)}
              isLoading={historyLoading}
              error={historyError}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
