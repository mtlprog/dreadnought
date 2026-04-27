"use client";

import type { SubfundSlice } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipProps } from "recharts";

const PALETTE = [
  "var(--cyber-green)",
  "var(--electric-cyan)",
  "var(--warning-amber)",
  "var(--secondary)",
];

interface SubfundPieChartProps {
  slices: readonly SubfundSlice[];
  date: string;
}

interface ChartDatum {
  name: string;
  value: number;
  rawValue: string;
  address: string;
  pct: number;
}

const renderTooltip = (props: TooltipProps<number, string>) => {
  if (props.active !== true || props.payload === undefined || props.payload.length === 0) return null;
  const datum = props.payload[0]?.payload as ChartDatum | undefined;
  if (datum === undefined) return null;
  return (
    <div className="border border-electric-cyan bg-background p-3 font-mono text-xs">
      <div className="text-cyber-green uppercase tracking-wider mb-1">{datum.name}</div>
      <div className="text-foreground">
        {formatNumber(datum.value, 2)} <span className="text-steel-gray">EURMTL</span>
      </div>
      <div className="text-warning-amber mt-1">{datum.pct.toFixed(2)}%</div>
    </div>
  );
};

const toFiniteNumber = (raw: string): number => {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

export function SubfundPieChart({ slices, date }: SubfundPieChartProps) {
  const data: ChartDatum[] = slices.map((slice) => ({
    name: slice.name,
    value: toFiniteNumber(slice.value),
    rawValue: slice.value,
    address: slice.address,
    pct: 0,
  }));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const enriched = data.map((d) => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }));

  return (
    <div className="border border-cyber-green bg-card p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-mono text-xl uppercase tracking-wider text-cyber-green">
          СТРУКТУРА САБФОНДОВ
        </h2>
        <span className="font-mono text-xs uppercase text-steel-gray">{date}</span>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={enriched}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              innerRadius={60}
              isAnimationActive={false}
              stroke="var(--background)"
              strokeWidth={2}
            >
              {enriched.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={renderTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {enriched.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 font-mono text-xs">
            <span
              className="block h-3 w-3 shrink-0"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="uppercase tracking-wider text-foreground truncate">{d.name}</div>
              <div className="text-warning-amber">{d.pct.toFixed(1)}%</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
