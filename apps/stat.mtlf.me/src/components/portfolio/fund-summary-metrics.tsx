"use client";

import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import React from "react";

interface FundSummaryMetricsProps {
  totalEURMTL: number;
  totalXLM: number;
  nominalEURMTL: number;
  nominalXLM: number;
  accountCount: number;
  tokenCount: number;
  isLoading?: boolean;
}

export function FundSummaryMetrics({
  totalEURMTL,
  totalXLM,
  nominalEURMTL,
  nominalXLM,
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
    <div className="space-y-4">
      {/* Nominal Totals */}
      <Card className="p-0 border-0 bg-card text-card-foreground overflow-hidden">
        <div className="bg-electric-cyan/10 border-l-4 border-electric-cyan p-6">
          <div className="mb-4">
            <h3 className="text-xl font-mono uppercase tracking-wider text-foreground">
              НОМИНАЛЬНЫЙ ИТОГ
            </h3>
            <p className="text-xs font-mono text-steel-gray uppercase mt-1">
              Цена за 1 токен × Баланс (без учета проскальзывания)
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
                НОМИНАЛ EURMTL
              </div>
              <div className="text-4xl font-mono text-electric-cyan">
                {formatNumber(nominalEURMTL ?? 0, 2)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
                НОМИНАЛ XLM
              </div>
              <div className="text-4xl font-mono text-electric-cyan">
                {formatNumber(nominalXLM ?? 0, 7)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
                СЧЕТОВ
              </div>
              <div className="text-3xl font-mono text-steel-gray">
                {accountCount}
              </div>
            </div>
            <div className="space-y-2">
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

      {/* Liquid Totals */}
      <Card className="p-0 border-0 bg-card text-card-foreground overflow-hidden">
        <div className="bg-cyber-green/10 border-l-4 border-cyber-green p-6">
          <div className="mb-4">
            <h3 className="text-xl font-mono uppercase tracking-wider text-foreground">
              ЛИКВИДНЫЙ ИТОГ
            </h3>
            <p className="text-xs font-mono text-steel-gray uppercase mt-1">
              Реальная стоимость при продаже всего баланса (с учетом проскальзывания)
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
                ЛИКВИД EURMTL
              </div>
              <div className="text-4xl font-mono text-warning-amber">
                {formatNumber(totalEURMTL ?? 0, 2)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
                ЛИКВИД XLM
              </div>
              <div className="text-4xl font-mono text-warning-amber">
                {formatNumber(totalXLM ?? 0, 7)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
                ПРОСКАЛЬЗЫВАНИЕ EURMTL
              </div>
              <div className="text-3xl font-mono text-warning-amber">
                {formatNumber((nominalEURMTL ?? 0) - (totalEURMTL ?? 0), 2)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-mono text-steel-gray uppercase tracking-wider">
                ПРОСКАЛЬЗЫВАНИЕ XLM
              </div>
              <div className="text-3xl font-mono text-warning-amber">
                {formatNumber((nominalXLM ?? 0) - (totalXLM ?? 0), 7)}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
