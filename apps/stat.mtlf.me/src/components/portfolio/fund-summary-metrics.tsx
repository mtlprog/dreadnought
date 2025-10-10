"use client";

import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import React from "react";

interface FundSummaryMetricsProps {
  totalEURMTL: number;
  totalXLM: number;
  accountCount: number;
  tokenCount: number;
  isLoading?: boolean;
}

export function FundSummaryMetrics({
  totalEURMTL,
  totalXLM,
  accountCount,
  tokenCount,
  isLoading = false,
}: FundSummaryMetricsProps) {
  if (isLoading) {
    return (
      <Card className="p-8 border-0 bg-card text-card-foreground">
        <div className="text-center">
          <div className="text-2xl text-cyber-green mb-4">⏳ ЗАГРУЗКА МЕТРИК...</div>
          <div className="text-steel-gray">Получение суммарных данных фонда...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-0 border-0 bg-card text-card-foreground overflow-hidden">
      <div className="bg-cyber-green/10 border-l-4 border-cyber-green p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Total EURMTL */}
          <div className="space-y-2">
            <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
              ВСЕГО EURMTL
            </div>
            <div className="text-4xl font-mono text-warning-amber">
              {formatNumber(totalEURMTL, 2)}
            </div>
            <div className="text-xs font-mono text-steel-gray uppercase">
              Суммарная стоимость в EURMTL
            </div>
          </div>

          {/* Total XLM */}
          <div className="space-y-2">
            <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
              ВСЕГО XLM
            </div>
            <div className="text-4xl font-mono text-warning-amber">
              {formatNumber(totalXLM, 7)}
            </div>
            <div className="text-xs font-mono text-steel-gray uppercase">
              Суммарная стоимость в XLM
            </div>
          </div>

          {/* Account Count */}
          <div className="space-y-2">
            <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
              СЧЕТОВ
            </div>
            <div className="text-4xl font-mono text-electric-cyan">
              {accountCount}
            </div>
            <div className="text-xs font-mono text-steel-gray uppercase">
              Активных счетов в фонде
            </div>
          </div>

          {/* Token Count */}
          <div className="space-y-2">
            <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
              ТОКЕНОВ
            </div>
            <div className="text-4xl font-mono text-electric-cyan">
              {tokenCount}
            </div>
            <div className="text-xs font-mono text-steel-gray uppercase">
              Уникальных токенов на балансе
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
