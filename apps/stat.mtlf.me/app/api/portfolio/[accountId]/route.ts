import { type AssetInfo, PortfolioService, PortfolioServiceLive, PriceService, PriceServiceLive } from "@/lib/stellar";
import { Effect, Layer, pipe } from "effect";
import { type NextRequest, NextResponse } from "next/server";

const AppLayer = Layer.merge(PortfolioServiceLive, PriceServiceLive);

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

const EURMTL_ASSET: AssetInfo = {
  code: "EURMTL",
  issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
  type: "credit_alphanum4",
};

const XLM_ASSET: AssetInfo = {
  code: "XLM",
  issuer: "",
  type: "native",
};

const fetchPortfolioWithPrices = (accountId: string) =>
  pipe(
    Effect.all({
      portfolioService: PortfolioService,
      priceService: PriceService,
    }),
    Effect.flatMap(({ portfolioService, priceService }) =>
      pipe(
        portfolioService.getAccountPortfolio(accountId),
        Effect.flatMap((portfolio) =>
          pipe(
            // Get prices for all tokens
            priceService.getTokensWithPrices(
              portfolio.tokens.map((token) => ({
                asset: token.asset,
                balance: token.balance,
              })),
              { eurmtl: EURMTL_ASSET, xlm: XLM_ASSET },
            ),
            Effect.map((tokensWithPrices) => ({
              accountId: portfolio.accountId,
              tokens: tokensWithPrices,
              xlmBalance: portfolio.xlmBalance,
            })),
            // If token pricing fails, still return basic portfolio data
            Effect.catchAll(() =>
              Effect.succeed({
                accountId: portfolio.accountId,
                tokens: portfolio.tokens.map(token => ({
                  asset: token.asset,
                  balance: token.balance,
                  priceInEURMTL: null,
                  priceInXLM: null,
                  valueInEURMTL: null,
                  valueInXLM: null,
                })),
                xlmBalance: portfolio.xlmBalance,
              })
            ),
          )
        ),
        Effect.flatMap((data) =>
          pipe(
            // Get XLM price in EURMTL
            priceService.getTokenPrice(XLM_ASSET, EURMTL_ASSET),
            Effect.map((xlmPrice) => ({
              ...data,
              xlmPriceInEURMTL: xlmPrice.price,
            })),
            Effect.catchAll(() =>
              Effect.succeed({
                ...data,
                xlmPriceInEURMTL: null,
              })
            ), // If XLM price fails, continue without it
          )
        ),
      )
    ),
  );

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { accountId } = await params;

  if (accountId.length === 0) {
    return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
  }

  const program = pipe(
    fetchPortfolioWithPrices(accountId),
    Effect.provide(AppLayer),
    Effect.tap(() => Effect.log(`Portfolio data fetched for account: ${accountId}`)),
    Effect.catchAll((error) =>
      pipe(
        Effect.log(`Portfolio API error: ${error}`),
        Effect.flatMap(() =>
          Effect.fail({
            error: "Failed to fetch portfolio data",
            message: error instanceof Error ? error.message : "Unknown error occurred",
            details: error instanceof Error && error.stack !== undefined ? error.stack : String(error),
          })
        ),
      )
    ),
  );

  return Effect.runPromise(program)
    .then(result => NextResponse.json(result))
    .catch(error => NextResponse.json(error, { status: 500 }));
}
