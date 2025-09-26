"use client";

import type { TokenPriceWithBalance } from "@/lib/stellar/price-service";
import { useEffect, useState } from "react";
import { PortfolioTable } from "./portfolio-table";

interface PortfolioData {
  accountId: string;
  tokens: readonly TokenPriceWithBalance[];
  xlmBalance: string;
  xlmPriceInEURMTL?: string;
}

interface PortfolioClientProps {
  initialData?: PortfolioData;
}

export function PortfolioClient({ initialData }: PortfolioClientProps) {
  const [data, setData] = useState<PortfolioData | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData == null) {
      void fetchPortfolioData();
    }
  }, [initialData]);

  async function fetchPortfolioData() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/portfolio/GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const portfolioData = await response.json();
      setData(portfolioData);
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (error !== null && error !== "") {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="text-6xl text-warning-amber mb-8">⚠️</div>
          <h1 className="text-4xl font-mono uppercase tracking-wider text-white mb-4">ОШИБКА</h1>
          <p className="text-xl text-steel-gray mb-8">{error}</p>
          <button
            onClick={() => void fetchPortfolioData()}
            className="bg-cyber-green text-black px-8 py-4 font-mono uppercase tracking-wider hover:bg-electric-cyan transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <PortfolioTable
          accountId="GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V"
          tokens={[]}
          xlmBalance="0"
          isLoading={true}
        />
      </div>
    );
  }

  if (data == null) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-mono uppercase tracking-wider text-steel-gray">НЕТ ДАННЫХ</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <PortfolioTable
        accountId={data.accountId}
        tokens={data.tokens}
        xlmBalance={data.xlmBalance}
        xlmPriceInEURMTL={data.xlmPriceInEURMTL}
        isLoading={false}
      />
    </div>
  );
}
