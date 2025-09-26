"use client";

import { useState, useEffect } from "react";
import { PortfolioTable } from "./portfolio-table";
import { TokenPriceWithBalance } from "@/lib/stellar/price-service";

const MTLF_ACCOUNT = "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V";

export function PortfolioDemo() {
  const [tokens, setTokens] = useState<TokenPriceWithBalance[]>([]);
  const [xlmBalance, setXlmBalance] = useState<string>("0");
  const [xlmPriceInEURMTL, setXlmPriceInEURMTL] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/portfolio/${MTLF_ACCOUNT}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        setTokens(data.tokens);
        setXlmBalance(data.xlmBalance);
        setXlmPriceInEURMTL(data.xlmPriceInEURMTL || "0.31");
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch portfolio:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  if (error) {
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

  return (
    <div className="container mx-auto px-4 py-16">
      <PortfolioTable
        accountId={MTLF_ACCOUNT}
        tokens={tokens}
        xlmBalance={xlmBalance}
        xlmPriceInEURMTL={xlmPriceInEURMTL}
        isLoading={isLoading}
      />

      {!isLoading && (
        <div className="mt-8 p-6 border border-cyber-green bg-cyber-green/10">
          <p className="font-mono text-cyber-green uppercase tracking-wider text-center">
            ✅ РЕАЛЬНЫЕ ДАННЫЕ // STELLAR BLOCKCHAIN // {tokens.length} ТОКЕНОВ
          </p>
        </div>
      )}
    </div>
  );
}