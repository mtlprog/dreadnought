"use client";

import type { Indicator, IndicatorChange, Range } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";

interface IndicatorCardProps {
  indicator: Indicator;
}

const PERIODS: readonly Range[] = ["30d", "90d", "365d"];
const PERIOD_LABEL: Record<Range, string> = {
  "30d": "30D",
  "90d": "90D",
  "180d": "180D",
  "365d": "1Y",
  all: "ALL",
};

export const INDICATOR_ROW_GRID =
  "grid grid-cols-[3rem_minmax(0,1fr)_minmax(7rem,auto)] sm:grid-cols-[3rem_minmax(0,1fr)_minmax(7rem,auto)_repeat(3,minmax(4.5rem,auto))] items-center gap-x-3";

const toNum = (raw: string): number => {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

const formatSignedPct = (raw: string): string => {
  const n = toNum(raw);
  const sign = n > 0 ? "+" : "";
  return `${sign}${formatNumber(n, 2)}`;
};

const changeColor = (raw: string): string => {
  const n = toNum(raw);
  if (n > 0) return "text-cyber-green";
  if (n < 0) return "text-red-400";
  return "text-steel-gray";
};

const formatIndicatorValue = (indicator: Indicator): { value: string; unit: string } => {
  const valueNum = toNum(indicator.value);
  const decimals = indicator.unit === "%" ? 2 : valueNum >= 1000 ? 0 : 4;
  return { value: formatNumber(valueNum, decimals), unit: indicator.unit };
};

function ChangeRow({ period, change }: { period: Range; change: IndicatorChange }) {
  return (
    <div className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
      <span className="uppercase tracking-wider text-steel-gray">{PERIOD_LABEL[period]}</span>
      <span className={changeColor(change.pct)}>
        {formatSignedPct(change.pct)}%
      </span>
    </div>
  );
}

export function IndicatorCard({ indicator }: IndicatorCardProps) {
  const { value, unit } = formatIndicatorValue(indicator);

  return (
    <div className="border border-steel-gray/40 bg-card p-4 hover:border-electric-cyan transition-colors">
      <div className="font-mono text-[10px] uppercase tracking-widest text-steel-gray">
        I{indicator.id}
      </div>
      <h3 className="font-mono text-sm uppercase tracking-wider text-foreground mt-1 line-clamp-2 min-h-[2.5em]">
        {indicator.name}
      </h3>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-2xl text-cyber-green">{value}</span>
        <span className="font-mono text-xs uppercase text-steel-gray">{unit}</span>
      </div>

      {indicator.changes !== undefined && (
        <div className="mt-3 space-y-1 border-t border-steel-gray/30 pt-2">
          {PERIODS.map((p) => {
            const change = indicator.changes?.[p];
            return change !== undefined ? <ChangeRow key={p} period={p} change={change} /> : null;
          })}
        </div>
      )}

      {indicator.description !== "" && (
        <p className="mt-3 font-mono text-[10px] text-steel-gray line-clamp-3">
          {indicator.description}
        </p>
      )}
    </div>
  );
}

export function IndicatorRow({ indicator }: IndicatorCardProps) {
  const { value, unit } = formatIndicatorValue(indicator);

  return (
    <div
      className={`${INDICATOR_ROW_GRID} border border-steel-gray/40 bg-card px-3 py-2 hover:border-electric-cyan transition-colors`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-steel-gray">
        I{indicator.id}
      </span>
      <span
        className="font-mono text-xs uppercase tracking-wider text-foreground truncate"
        title={indicator.description !== "" ? indicator.description : indicator.name}
      >
        {indicator.name}
      </span>
      <span className="font-mono text-sm tabular-nums whitespace-nowrap text-right">
        <span className="text-cyber-green">{value}</span>
        <span className="ml-1 text-[10px] uppercase text-steel-gray">{unit}</span>
      </span>
      {PERIODS.map((p) => {
        const change = indicator.changes?.[p];
        const colorClass = change !== undefined ? changeColor(change.pct) : "text-steel-gray/60";
        return (
          <span
            key={p}
            className={`hidden sm:block font-mono text-[11px] tabular-nums whitespace-nowrap text-right ${colorClass}`}
          >
            {change !== undefined ? `${formatSignedPct(change.pct)}%` : "—"}
          </span>
        );
      })}
    </div>
  );
}

export function IndicatorRowHeader() {
  return (
    <div className={`${INDICATOR_ROW_GRID} px-3 pb-1 font-mono text-[10px] uppercase tracking-widest text-steel-gray`}>
      <span>ID</span>
      <span>NAME</span>
      <span className="text-right">VALUE</span>
      {PERIODS.map((p) => (
        <span key={p} className="hidden sm:block text-right">
          {PERIOD_LABEL[p]}
        </span>
      ))}
    </div>
  );
}
