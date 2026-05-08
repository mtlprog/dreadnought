"use client";

import type { IndicatorSeries } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

interface IndicatorComparisonChartProps {
  marketId: number;
  bookId: number;
  marketFallbackName: string;
  bookFallbackName: string;
  marketSeries: IndicatorSeries | undefined;
  bookSeries: IndicatorSeries | undefined;
  isLoading: boolean;
  error: string | null;
}

interface ComparisonPoint {
  date: string;
  market: number | null;
  book: number | null;
}

const formatDateShort = (iso: string): string => {
  const d = iso.split("T")[0] ?? iso;
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}.${parts[1]}`;
};

const toFinite = (raw: string): number | null => {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
};

const lastDefined = (points: readonly ComparisonPoint[], key: "market" | "book"): number | null => {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const point = points[i];
    if (point === undefined) continue;
    const value = point[key];
    if (value !== null) return value;
  }
  return null;
};

const mergeSeries = (
  market: IndicatorSeries | undefined,
  book: IndicatorSeries | undefined,
): ComparisonPoint[] => {
  const byDate = new Map<string, ComparisonPoint>();

  const upsert = (date: string): ComparisonPoint => {
    const existing = byDate.get(date);
    if (existing !== undefined) return existing;
    const fresh: ComparisonPoint = { date, market: null, book: null };
    byDate.set(date, fresh);
    return fresh;
  };

  if (market !== undefined) {
    for (const p of market.points) {
      upsert(p.date).market = toFinite(p.value);
    }
  }
  if (book !== undefined) {
    for (const p of book.points) {
      upsert(p.date).book = toFinite(p.value);
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
};

interface TooltipDatum {
  market: number | null;
  book: number | null;
  date: string;
}

const renderTooltip = (unit: string, marketLabel: string, bookLabel: string) =>
  function TooltipContent(props: TooltipProps<number, string>) {
    if (props.active !== true || props.payload === undefined || props.payload.length === 0) return null;
    const datum = props.payload[0]?.payload as TooltipDatum | undefined;
    if (datum === undefined) return null;
    return (
      <div className="border border-electric-cyan bg-background p-2 space-y-1 font-mono text-xs">
        <div className="text-steel-gray uppercase">{datum.date.split("T")[0] ?? ""}</div>
        <div className="flex items-baseline gap-2">
          <span className="inline-block h-2 w-2 bg-cyber-green" aria-hidden />
          <span className="text-steel-gray uppercase">{marketLabel}</span>
          <span className="text-cyber-green ml-auto">
            {datum.market !== null ? formatNumber(datum.market, 4) : "—"}{" "}
            <span className="text-steel-gray">{unit}</span>
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="inline-block h-2 w-2 bg-electric-cyan" aria-hidden />
          <span className="text-steel-gray uppercase">{bookLabel}</span>
          <span className="text-electric-cyan ml-auto">
            {datum.book !== null ? formatNumber(datum.book, 4) : "—"}{" "}
            <span className="text-steel-gray">{unit}</span>
          </span>
        </div>
      </div>
    );
  };

export function IndicatorComparisonChart({
  marketId,
  bookId,
  marketFallbackName,
  bookFallbackName,
  marketSeries,
  bookSeries,
  isLoading,
  error,
}: IndicatorComparisonChartProps) {
  const points = mergeSeries(marketSeries, bookSeries);
  const marketName = marketSeries?.name ?? marketFallbackName;
  const bookName = bookSeries?.name ?? bookFallbackName;
  const unit = marketSeries?.unit ?? bookSeries?.unit ?? "";

  const lastMarket = lastDefined(points, "market");
  const lastBook = lastDefined(points, "book");
  const spreadPct = lastMarket !== null && lastBook !== null && lastBook !== 0
    ? ((lastMarket - lastBook) / lastBook) * 100
    : null;

  const spreadTone = spreadPct === null
    ? "text-steel-gray"
    : spreadPct >= 0
    ? "text-cyber-green"
    : "text-red-400";
  const spreadLabel = spreadPct === null ? null : spreadPct >= 0 ? "PREMIUM" : "DISCOUNT";
  const spreadSign = spreadPct === null ? "" : spreadPct >= 0 ? "+" : "";

  return (
    <div className="border border-electric-cyan bg-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-steel-gray">
              I{marketId}/I{bookId}
            </div>
            <h3 className="font-mono text-lg uppercase tracking-wider text-electric-cyan">
              MARKET vs BOOK
            </h3>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-steel-gray">
              <span className="inline-block h-2 w-2 bg-cyber-green" aria-hidden />
              <span>{marketName}</span>
            </span>
            <span className="flex items-center gap-1.5 text-steel-gray">
              <span className="inline-block h-2 w-2 bg-electric-cyan" aria-hidden />
              <span>{bookName}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end font-mono text-xs">
          <div className="flex items-baseline gap-3">
            {lastMarket !== null && (
              <span className="text-cyber-green">
                {formatNumber(lastMarket, 4)} <span className="text-steel-gray">{unit}</span>
              </span>
            )}
            {lastBook !== null && (
              <span className="text-electric-cyan">
                {formatNumber(lastBook, 4)} <span className="text-steel-gray">{unit}</span>
              </span>
            )}
          </div>
          {spreadPct !== null && spreadLabel !== null && (
            <div className="flex items-baseline gap-1 text-[10px] uppercase tracking-wider">
              <span className={spreadTone}>{spreadLabel}</span>
              <span className={spreadTone}>
                {spreadSign}
                {formatNumber(spreadPct, 2)}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="h-[260px]">
        {error !== null && (
          <div className="flex h-full items-center justify-center font-mono text-xs uppercase text-red-400">
            ERROR: {error}
          </div>
        )}
        {error === null && isLoading && (
          <div className="flex h-full items-center justify-center font-mono text-xs uppercase text-steel-gray">
            LOADING…
          </div>
        )}
        {error === null && !isLoading && points.length === 0 && (
          <div className="flex h-full items-center justify-center font-mono text-xs uppercase text-steel-gray">
            NO DATA
          </div>
        )}
        {error === null && !isLoading && points.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                stroke="var(--steel-gray)"
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--steel-gray)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={32}
              />
              <YAxis
                stroke="var(--steel-gray)"
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--steel-gray)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                width={64}
                tickFormatter={(v: number) => formatNumber(v, 2)}
              />
              <Tooltip
                content={renderTooltip(unit, marketName, bookName)}
                cursor={{ stroke: "var(--electric-cyan)", strokeDasharray: "2 2" }}
              />
              <Line
                type="linear"
                dataKey="market"
                name={marketName}
                stroke="var(--cyber-green)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--cyber-green)", stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls={true}
              />
              <Line
                type="linear"
                dataKey="book"
                name={bookName}
                stroke="var(--electric-cyan)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--electric-cyan)", stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
