"use client";

import type { SubfundSlice } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
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
  totalValue?: string;
  totalUnit?: string;
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

const parseFiniteOrNull = (raw: string | undefined): number | null => {
  if (raw === undefined) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
};

export function SubfundPieChart({ slices, date, totalValue, totalUnit }: SubfundPieChartProps) {
  const sliceValues = slices.map((s) => toFiniteNumber(s.value));
  const total = sliceValues.reduce((sum, v) => sum + v, 0);
  const enriched: ChartDatum[] = slices.map((slice, i) => {
    const value = sliceValues[i] ?? 0;
    return {
      name: slice.name,
      value,
      rawValue: slice.value,
      address: slice.address,
      pct: total > 0 ? (value / total) * 100 : 0,
    };
  });

  const totalNum = parseFiniteOrNull(totalValue);

  return (
    <div className="border border-cyber-green bg-card p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-mono text-xl uppercase tracking-wider text-cyber-green">
          SUBFUND STRUCTURE
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
              {enriched.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip content={renderTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
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

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-steel-gray/30 pt-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-steel-gray">
            TOTAL ASSETS VALUE (I3)
          </div>
          <div className="mt-1 font-mono">
            {totalNum !== null
              ? (
                <>
                  <span className="text-3xl text-cyber-green">{formatNumber(totalNum, 2)}</span>
                  {totalUnit !== undefined && (
                    <span className="ml-2 text-xs uppercase text-steel-gray">{totalUnit}</span>
                  )}
                </>
              )
              : <span className="text-2xl text-steel-gray">—</span>}
          </div>
        </div>
        <Link
          href="/fund"
          className="inline-flex items-center gap-2 border border-electric-cyan bg-background px-4 py-2 font-mono text-xs uppercase tracking-wider text-electric-cyan hover:bg-electric-cyan hover:text-background transition-colors"
        >
          DETAILS
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
