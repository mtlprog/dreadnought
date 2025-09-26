"use client";

import { SystemLoading } from "@/components/ui/loading-skeleton";
import { useFundData } from "@/hooks/use-fund-data";
import { FundStructureTable } from "./fund-structure-table";

export function PortfolioDemo() {
  const { data: fundData, isLoading, error, progress: loadingProgress } = useFundData();

  if (error != null) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="border border-red-500 bg-red-500/10 p-6">
          <h2 className="font-mono text-red-500 uppercase tracking-wider text-xl mb-2">
            ❌ ОШИБКА ЗАГРУЗКИ
          </h2>
          <p className="font-mono text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-500 text-white px-4 py-2 font-mono uppercase tracking-wider hover:bg-red-600 transition-colors"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  if (isLoading === true) {
    return (
      <SystemLoading
        title="ЗАГРУЗКА ФОНДА MONTELIBERO"
        subtitle="Получение данных со всех счетов фонда..."
        progress={loadingProgress}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Content */}
      {fundData != null && <FundStructureTable fundData={fundData} isLoading={false} />}

      {/* Status Indicator */}
      {fundData != null && (
        <div className="mt-8 p-6 border border-cyber-green bg-cyber-green/10">
          <p className="font-mono text-cyber-green uppercase tracking-wider text-center">
            ✅ РЕАЛЬНЫЕ ДАННЫЕ // STELLAR BLOCKCHAIN // {fundData.aggregatedTotals.accountCount} СЧЕТОВ //{" "}
            {fundData.aggregatedTotals.tokenCount} ТОКЕНОВ
          </p>
        </div>
      )}
    </div>
  );
}
