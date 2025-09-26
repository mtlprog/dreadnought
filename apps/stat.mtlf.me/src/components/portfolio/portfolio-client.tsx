"use client";

import type { TokenPriceWithBalance } from "@/lib/stellar/price-service";
import { handleStateError } from "@/lib/utils/error-handling";
import * as S from "@effect/schema/Schema";
import { Effect, pipe } from "effect";
import { useEffect, useState } from "react";
import { PortfolioTable } from "./portfolio-table";

// Error definitions
export class FetchError extends S.TaggedError<FetchError>()(
  "FetchError",
  {
    message: S.String,
    status: S.optional(S.Number),
    cause: S.optional(S.Unknown),
  },
) {}

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

  function fetchPortfolioData() {
    const program = pipe(
      Effect.sync(() => setLoading(true)),
      Effect.tap(() => Effect.sync(() => setError(null))),
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () => fetch("/api/portfolio/GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V"),
          catch: (error) =>
            new FetchError({
              message: "Network request failed",
              cause: error,
            }),
        })
      ),
      Effect.flatMap((response) =>
        response.ok
          ? Effect.tryPromise({
            try: () => response.json(),
            catch: (error) =>
              new FetchError({
                message: "Failed to parse response",
                cause: error,
              }),
          })
          : Effect.fail(
            new FetchError({
              message: `HTTP error! status: ${response.status}`,
              status: response.status,
            }),
          )
      ),
      Effect.tap((portfolioData) =>
        pipe(
          Effect.sync(() => setData(portfolioData)),
          Effect.tap(() => Effect.log("Portfolio data fetched successfully")),
        )
      ),
      Effect.catchAll(handleStateError(setError, setLoading)),
    );

    Effect.runPromise(program).catch(() => {
      // Error already handled by Effect error handling
    });
  }

  if (error !== null && error !== "") {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="text-6xl text-warning-amber mb-8">⚠️</div>
          <h1 className="text-4xl font-mono uppercase tracking-wider text-white mb-4">ОШИБКА</h1>
          <p className="text-xl text-steel-gray mb-8">{error}</p>
          <button
            onClick={() => fetchPortfolioData()}
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
