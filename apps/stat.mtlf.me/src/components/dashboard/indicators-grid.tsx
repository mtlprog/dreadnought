"use client";

import type { Indicator } from "@/lib/api/types";
import { IndicatorCard } from "./indicator-card";

interface IndicatorsGridProps {
  data: readonly Indicator[];
  isLoading: boolean;
  error: string | null;
}

export function IndicatorsGrid({ data, isLoading, error }: IndicatorsGridProps) {
  return (
    <section className="border border-cyber-green bg-background p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-mono text-xl uppercase tracking-wider text-cyber-green">
          ИНДИКАТОРЫ ФОНДА
        </h2>
        {!isLoading && error === null && (
          <span className="font-mono text-xs uppercase text-steel-gray">
            {data.length} ПОКАЗАТЕЛЕЙ
          </span>
        )}
      </div>

      {error !== null && (
        <div className="border border-red-500 bg-red-500/10 p-4 font-mono text-sm text-red-400">
          ОШИБКА: {error}
        </div>
      )}

      {error === null && isLoading && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 border border-steel-gray/30 bg-steel-gray/10 animate-pulse" />
          ))}
        </div>
      )}

      {error === null && !isLoading && data.length === 0 && (
        <div className="border border-steel-gray/40 bg-steel-gray/10 p-8 text-center font-mono text-sm uppercase tracking-wider text-steel-gray">
          ИНДИКАТОРЫ ЕЩЁ НЕ РАССЧИТАНЫ
        </div>
      )}

      {error === null && !isLoading && data.length > 0 && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((indicator) => (
            <IndicatorCard key={indicator.id} indicator={indicator} />
          ))}
        </div>
      )}
    </section>
  );
}
