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

interface IndicatorHistoryChartProps {
  id: number;
  fallbackName: string;
  series: IndicatorSeries | undefined;
  isLoading: boolean;
  error: string | null;
}

interface PointDatum {
  date: string;
  value: number;
}

const formatDateShort = (iso: string): string => {
  const d = iso.split("T")[0] ?? iso;
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}.${parts[1]}`;
};

const toFinite = (raw: string): number => {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

const renderTooltip = (unit: string) =>
  function TooltipContent(props: TooltipProps<number, string>) {
    if (props.active !== true || props.payload === undefined || props.payload.length === 0) return null;
    const point = props.payload[0];
    if (point === undefined) return null;
    const datum = point.payload as PointDatum | undefined;
    const value = typeof point.value === "number" ? point.value : 0;
    return (
      <div className="border border-electric-cyan bg-background p-2 font-mono text-xs">
        <div className="text-steel-gray uppercase">{datum?.date.split("T")[0] ?? ""}</div>
        <div className="text-cyber-green">
          {formatNumber(value, 4)} <span className="text-steel-gray">{unit}</span>
        </div>
      </div>
    );
  };

export function IndicatorHistoryChart({
  id,
  fallbackName,
  series,
  isLoading,
  error,
}: IndicatorHistoryChartProps) {
  const points: PointDatum[] = series !== undefined
    ? series.points.map((p) => ({ date: p.date, value: toFinite(p.value) }))
    : [];
  const name = series?.name ?? fallbackName;
  const unit = series?.unit ?? "";

  const lastValue = points.length > 0 ? points[points.length - 1]?.value : undefined;

  return (
    <div className="border border-electric-cyan bg-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-steel-gray">
            I{id}
          </div>
          <h3 className="font-mono text-lg uppercase tracking-wider text-electric-cyan">
            {name}
          </h3>
        </div>
        {lastValue !== undefined && (
          <div className="font-mono text-sm text-warning-amber">
            {formatNumber(lastValue, 4)} <span className="text-steel-gray">{unit}</span>
          </div>
        )}
      </div>

      <div className="h-[220px]">
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
                tickFormatter={(v: number) => formatNumber(v, 0)}
              />
              <Tooltip
                content={renderTooltip(unit)}
                cursor={{ stroke: "var(--electric-cyan)", strokeDasharray: "2 2" }}
              />
              <Line
                type="linear"
                dataKey="value"
                stroke="var(--cyber-green)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--cyber-green)", stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
