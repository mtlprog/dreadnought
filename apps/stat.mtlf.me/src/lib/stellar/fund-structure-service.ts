import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, pipe } from "effect";
import type { EnvironmentError, StellarError, TokenPriceError } from "./errors";
import { type PortfolioService, PortfolioServiceTag } from "./portfolio-service";
import { type PriceService, PriceServiceTag, type TokenPriceWithBalance } from "./price-service";
import type { AssetInfo } from "./types";

export interface FundAccount {
  readonly id: string;
  readonly name: string;
  readonly type: "issuer" | "subfond" | "operational";
  readonly description: string;
}

const FundAccountSchema = S.Struct({
  id: S.String.pipe(S.pattern(/^G[A-Z2-7]{55}$/)),
  name: S.String.pipe(S.nonEmptyString()),
  type: S.Literal("issuer", "subfond", "operational"),
  description: S.String.pipe(S.nonEmptyString()),
});

export interface FundAccountPortfolio extends FundAccount {
  readonly tokens: readonly TokenPriceWithBalance[];
  readonly xlmBalance: string;
  readonly xlmPriceInEURMTL: string | null;
  readonly totalEURMTL: number;
  readonly totalXLM: number;
}

export interface FundStructureData {
  readonly accounts: readonly FundAccountPortfolio[];
  readonly aggregatedTotals: {
    readonly totalEURMTL: number;
    readonly totalXLM: number;
    readonly accountCount: number;
    readonly tokenCount: number;
  };
}

export interface FundStructureService {
  readonly getFundStructure: () => Effect.Effect<
    FundStructureData,
    TokenPriceError | StellarError | EnvironmentError,
    PortfolioService | PriceService
  >;
  readonly getFundAccounts: () => Effect.Effect<readonly FundAccount[], never>;
}

export const FundStructureServiceTag = Context.GenericTag<FundStructureService>(
  "@stat.mtlf.me/FundStructureService",
);

// Fund accounts from FUND_STRUCTURE.md - validated with Schema
const FUND_ACCOUNTS_RAW = [
  {
    id: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
    name: "MAIN ISSUER",
    type: "issuer",
    description: "Основной эмитент токенов фонда",
  },
  {
    id: "GAQ5ERJVI6IW5UVNPEVXUUVMXH3GCDHJ4BJAXMAAKPR5VBWWAUOMABIZ",
    name: "MABIZ",
    type: "subfond",
    description: "Сабфонд малого и среднего бизнеса",
  },
  {
    id: "GA7I6SGUHQ26ARNCD376WXV5WSE7VJRX6OEFNFCEGRLFGZWQIV73LABR",
    name: "LABR",
    type: "subfond",
    description: "Сабфонд трудовых ресурсов",
  },
  {
    id: "GCOJHUKGHI6IATN7AIEK4PSNBPXIAIZ7KB2AWTTUCNIAYVPUB2DMCITY",
    name: "CITY",
    type: "subfond",
    description: "Сабфонд городской инфраструктуры",
  },
  {
    id: "GCR5J3NU2NNG2UKDQ5XSZVX7I6TDLB3LEN2HFUR2EPJUMNWCUL62MTLM",
    name: "MTLM",
    type: "subfond",
    description: "Сабфонд Montelibero Meta",
  },
  {
    id: "GAEZHXMFRW2MWLWCXSBNZNUSE6SN3ODZDDOMPFH3JPMJXN4DKBPMDEFI",
    name: "DEFI",
    type: "subfond",
    description: "Сабфонд децентрализованных финансов",
  },
] as const;

const FUND_ACCOUNTS: readonly FundAccount[] = S.decodeUnknownSync(
  S.Array(FundAccountSchema),
)(FUND_ACCOUNTS_RAW);

const AssetInfoSchema = S.Struct({
  code: S.String.pipe(S.nonEmptyString()),
  issuer: S.String,
  type: S.Literal("native", "credit_alphanum4", "credit_alphanum12"),
});

const EURMTL_ASSET_RAW = {
  code: "EURMTL",
  issuer: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
  type: "credit_alphanum4",
} as const;

const XLM_ASSET_RAW = {
  code: "XLM",
  issuer: "",
  type: "native",
} as const;

const EURMTL_ASSET: AssetInfo = S.decodeUnknownSync(AssetInfoSchema)(EURMTL_ASSET_RAW);
const XLM_ASSET: AssetInfo = S.decodeUnknownSync(AssetInfoSchema)(XLM_ASSET_RAW);

const calculateAccountTotals = (
  tokens: readonly TokenPriceWithBalance[],
  xlmBalance: string,
  xlmPriceInEURMTL: string | null,
): { totalEURMTL: number; totalXLM: number } => {
  // Filter only liquid tokens (those with prices)
  const liquidTokens = tokens.filter(token => token.priceInXLM !== null || token.priceInEURMTL !== null);

  const totalEURMTL = liquidTokens.reduce((sum, token) => {
    if (token.valueInEURMTL !== null && token.valueInEURMTL !== undefined) {
      return sum + parseFloat(token.valueInEURMTL);
    }
    return sum;
  }, 0) + (xlmPriceInEURMTL !== null && xlmPriceInEURMTL !== undefined
    ? parseFloat(xlmBalance) * parseFloat(xlmPriceInEURMTL)
    : 0);

  const totalXLM = liquidTokens.reduce((sum, token) => {
    if (token.valueInXLM !== null && token.valueInXLM !== undefined) {
      return sum + parseFloat(token.valueInXLM);
    }
    return sum;
  }, 0) + parseFloat(xlmBalance);

  return { totalEURMTL, totalXLM };
};

const getAccountPortfolio = (
  account: FundAccount,
): Effect.Effect<
  FundAccountPortfolio,
  TokenPriceError | StellarError | EnvironmentError,
  PortfolioService | PriceService
> =>
  pipe(
    Effect.all({
      portfolioService: PortfolioServiceTag,
      priceService: PriceServiceTag,
    }),
    Effect.flatMap(({ portfolioService, priceService }) =>
      pipe(
        portfolioService.getAccountPortfolio(account.id),
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
            Effect.flatMap((tokensWithPrices) =>
              pipe(
                // Get XLM price in EURMTL
                priceService.getTokenPrice(XLM_ASSET, EURMTL_ASSET),
                Effect.map((xlmPrice) => {
                  const xlmPriceInEURMTL = xlmPrice.price;
                  const { totalEURMTL, totalXLM } = calculateAccountTotals(
                    tokensWithPrices,
                    portfolio.xlmBalance,
                    xlmPriceInEURMTL,
                  );

                  return {
                    ...account,
                    tokens: tokensWithPrices,
                    xlmBalance: portfolio.xlmBalance,
                    xlmPriceInEURMTL,
                    totalEURMTL,
                    totalXLM,
                  };
                }),
                Effect.catchAll(() =>
                  Effect.succeed({
                    ...account,
                    tokens: tokensWithPrices,
                    xlmBalance: portfolio.xlmBalance,
                    xlmPriceInEURMTL: null,
                    totalEURMTL: 0,
                    totalXLM: parseFloat(portfolio.xlmBalance),
                  })
                ),
              )
            ),
            // If token pricing fails, still return basic data
            Effect.catchAll(() =>
              Effect.succeed({
                ...account,
                tokens: portfolio.tokens.map(token => ({
                  asset: token.asset,
                  balance: token.balance,
                  priceInEURMTL: null,
                  priceInXLM: null,
                  valueInEURMTL: null,
                  valueInXLM: null,
                })),
                xlmBalance: portfolio.xlmBalance,
                xlmPriceInEURMTL: null,
                totalEURMTL: 0,
                totalXLM: parseFloat(portfolio.xlmBalance),
              })
            ),
          )
        ),
      )
    ),
  );

const getFundStructureImpl = (): Effect.Effect<
  FundStructureData,
  TokenPriceError | StellarError | EnvironmentError,
  PortfolioService | PriceService
> =>
  pipe(
    Effect.all(
      FUND_ACCOUNTS.map(getAccountPortfolio),
      { concurrency: 3 }, // Limit concurrent requests
    ),
    Effect.map((accounts) => {
      // Calculate aggregated totals
      const aggregatedTotals = accounts.reduce(
        (totals, account) => ({
          totalEURMTL: totals.totalEURMTL + account.totalEURMTL,
          totalXLM: totals.totalXLM + account.totalXLM,
          accountCount: totals.accountCount + 1,
          tokenCount: totals.tokenCount + account.tokens.length,
        }),
        {
          totalEURMTL: 0,
          totalXLM: 0,
          accountCount: 0,
          tokenCount: 0,
        },
      );

      return {
        accounts,
        aggregatedTotals,
      };
    }),
  );

const getFundAccountsImpl = (): Effect.Effect<readonly FundAccount[], never> => Effect.succeed(FUND_ACCOUNTS);

export const FundStructureServiceLive = Layer.succeed(FundStructureServiceTag, {
  getFundStructure: getFundStructureImpl,
  getFundAccounts: getFundAccountsImpl,
});
