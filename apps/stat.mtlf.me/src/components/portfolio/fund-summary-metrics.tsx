"use client";

import { Card } from "@/components/ui/card";
import { TruncatedNumber } from "@/components/ui/truncated-number";
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
      <div className="bg-electric-cyan/10 border-l-4 border-electric-cyan p-6">
        <div className="mb-4">
          <h3 className="text-xl font-mono uppercase tracking-wider text-foreground">
            ИТОГО ПО ФОНДУ
          </h3>
          <p className="text-xs font-mono text-steel-gray uppercase mt-1">
            Цена за 1 токен × Баланс
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          <div className="space-y-2 min-w-0">
            <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
              ИТОГО EURMTL
            </div>
            <div className="text-4xl font-mono text-electric-cyan break-all">
              <TruncatedNumber
                value={totalEURMTL ?? 0}
                truncatedDecimals={0}
                fullDecimals={2}
                className="text-electric-cyan"
              />
            </div>
          </div>
          <div className="space-y-2 min-w-0">
            <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
              ИТОГО XLM
            </div>
            <div className="text-4xl font-mono text-electric-cyan break-all">
              <TruncatedNumber
                value={totalXLM ?? 0}
                truncatedDecimals={0}
                fullDecimals={7}
                className="text-electric-cyan"
              />
            </div>
          </div>
          <div className="space-y-2 min-w-0">
            <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
              СЧЕТОВ
            </div>
            <div className="text-3xl font-mono text-steel-gray">
              {accountCount}
            </div>
          </div>
          <div className="space-y-2 min-w-0">
            <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
              ТОКЕНОВ
            </div>
            <div className="text-3xl font-mono text-steel-gray">
              {tokenCount}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
