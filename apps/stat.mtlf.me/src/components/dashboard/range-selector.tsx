"use client";

import { type Range, RANGES } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const LABELS: Record<Range, string> = {
  "30d": "30D",
  "90d": "90D",
  "180d": "180D",
  "365d": "1Y",
  all: "ALL",
};

interface RangeSelectorProps {
  value: Range;
  onChange: (range: Range) => void;
  className?: string;
}

export function RangeSelector({ value, onChange, className }: RangeSelectorProps) {
  return (
    <div
      className={cn(
        "inline-flex border border-electric-cyan bg-background font-mono text-xs uppercase",
        className,
      )}
      role="group"
      aria-label="Range selector"
    >
      {RANGES.map((range, i) => {
        const active = range === value;
        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            className={cn(
              "min-h-[48px] min-w-[48px] px-4 py-2 tracking-wider transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-green",
              i > 0 && "border-l border-electric-cyan",
              active
                ? "bg-electric-cyan text-background"
                : "text-electric-cyan hover:bg-electric-cyan/10",
            )}
          >
            {LABELS[range]}
          </button>
        );
      })}
    </div>
  );
}
