import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, pipe } from "effect";
import type { EnvironmentError, StellarError, TokenPriceError } from "./errors";
import { type PortfolioService, PortfolioServiceTag } from "./portfolio-service";
import { type PriceService, PriceServiceTag, type TokenPriceWithBalance } from "./price-service";
import type { AssetInfo } from "./types";

export interface FundAccount {
  readonly id: string;
  readonly name: string;
  readonly type: "issuer" | "subfond" | "mutual" | "operational" | "other";
  readonly description: string;
}

const FundAccountSchema = S.Struct({
  id: S.String.pipe(S.pattern(/^G[A-Z2-7]{55}$/)),
  name: S.String.pipe(S.nonEmptyString()),
  type: S.Literal("issuer", "subfond", "mutual", "operational", "other"),
  description: S.String.pipe(S.nonEmptyString()),
});

export interface FundAccountPortfolio extends FundAccount {
  readonly tokens: readonly TokenPriceWithBalance[];
  readonly xlmBalance: string;
  readonly xlmPriceInEURMTL: string | null;
  readonly totalEURMTL: number; // Liquid total (with slippage)
  readonly totalXLM: number; // Liquid total (with slippage)
  readonly nominalEURMTL: number; // Nominal total (spot price * balance)
  readonly nominalXLM: number; // Nominal total (spot price * balance)
}

export interface FundStructureData {
  readonly accounts: readonly FundAccountPortfolio[];
  readonly otherAccounts: readonly FundAccountPortfolio[];
  readonly aggregatedTotals: {
    readonly totalEURMTL: number; // Liquid total
    readonly totalXLM: number; // Liquid total
    readonly nominalEURMTL: number; // Nominal total (spot * balance)
    readonly nominalXLM: number; // Nominal total (spot * balance)
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
  // Main Issuer
  {
    id: "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V",
    name: "MAIN ISSUER",
    type: "issuer",
    description: "Основной эмитент токенов фонда",
  },
  // Subfonds
  {
    id: "GAQ5ERJVI6IW5UVNPEVXUUVMXH3GCDHJ4BJAXMAAKPR5VBWWAUOMABIZ",
    name: "MABIZ",
    type: "subfond",
    description: "Сабфонд малого и среднего бизнеса",
  },
  {
    id: "GCOJHUKGHI6IATN7AIEK4PSNBPXIAIZ7KB2AWTTUCNIAYVPUB2DMCITY",
    name: "CITY",
    type: "subfond",
    description: "Сабфонд городской инфраструктуры",
  },
  {
    id: "GAEZHXMFRW2MWLWCXSBNZNUSE6SN3ODZDDOMPFH3JPMJXN4DKBPMDEFI",
    name: "DEFI",
    type: "subfond",
    description: "Сабфонд децентрализованных финансов",
  },
  // Mutuals
  {
    id: "GCKCV7T56CAPFUYMCQUYSEUMZRC7GA7CAQ2BOL3RPS4NQXDTRCSULMFB",
    name: "MFB",
    type: "mutual",
    description: "Mutual Fund Business",
  },
  {
    id: "GD2SNF4QHUJD6VRAXWDA4CDUYENYB23YDFQ74DVC4P5SYR54AAVCUMFA",
    name: "APART",
    type: "mutual",
    description: "Mutual Fund Apartments",
  },
  // Operational
  {
    id: "GBSCMGJCE4DLQ6TYRNUMXUZZUXGZBM4BXVZUIHBBL5CSRRW2GWEHUADM",
    name: "ADMIN",
    type: "operational",
    description: "Операционный счёт администрирования",
  },
  // Others (not included in fund totals)
  {
    id: "GA7I6SGUHQ26ARNCD376WXV5WSE7VJRX6OEFNFCEGRLFGZWQIV73LABR",
    name: "LABR",
    type: "other",
    description: "Трудовые ресурсы (не входит в общий счёт фонда)",
  },
  {
    id: "GCR5J3NU2NNG2UKDQ5XSZVX7I6TDLB3LEN2HFUR2EPJUMNWCUL62MTLM",
    name: "MTLM",
    type: "other",
    description: "Montelibero Meta (не входит в общий счёт фонда)",
  },
  {
    id: "GDRLJC6EOKRR3BPKWGJPGI5GUN4GZFZRWQFDG3RJNZJEIBYA7B3EPROG",
    name: "PROGRAMMERS GUILD",
    type: "other",
    description: "Гильдия программистов (не входит в общий счёт фонда)",
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
): {
  totalEURMTL: number;
  totalXLM: number;
  nominalEURMTL: number;
  nominalXLM: number;
} => {
  // Liquid totals (with slippage from full balance execution)
  const totalEURMTL = tokens.reduce((sum, token) => {
    if (token.valueInEURMTL !== null && token.valueInEURMTL !== undefined) {
      return sum + parseFloat(token.valueInEURMTL);
    }
    return sum;
  }, 0) + (xlmPriceInEURMTL !== null && xlmPriceInEURMTL !== undefined
    ? parseFloat(xlmBalance) * parseFloat(xlmPriceInEURMTL)
    : 0);

  const totalXLM = tokens.reduce((sum, token) => {
    if (token.valueInXLM !== null && token.valueInXLM !== undefined) {
      return sum + parseFloat(token.valueInXLM);
    }
    return sum;
  }, 0) + parseFloat(xlmBalance);

  // Nominal totals (spot price * balance, no slippage)
  const nominalEURMTL = tokens.reduce((sum, token) => {
    if (token.priceInEURMTL !== null && token.priceInEURMTL !== undefined) {
      return sum + parseFloat(token.balance) * parseFloat(token.priceInEURMTL);
    }
    return sum;
  }, 0) + (xlmPriceInEURMTL !== null && xlmPriceInEURMTL !== undefined
    ? parseFloat(xlmBalance) * parseFloat(xlmPriceInEURMTL)
    : 0);

  const nominalXLM = tokens.reduce((sum, token) => {
    if (token.priceInXLM !== null && token.priceInXLM !== undefined) {
      return sum + parseFloat(token.balance) * parseFloat(token.priceInXLM);
    }
    return sum;
  }, 0) + parseFloat(xlmBalance);

  return { totalEURMTL, totalXLM, nominalEURMTL, nominalXLM };
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
                  const { totalEURMTL, totalXLM, nominalEURMTL, nominalXLM } = calculateAccountTotals(
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
                    nominalEURMTL,
                    nominalXLM,
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
                    nominalEURMTL: 0,
                    nominalXLM: parseFloat(portfolio.xlmBalance),
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
                nominalEURMTL: 0,
                nominalXLM: parseFloat(portfolio.xlmBalance),
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
      FUND_ACCOUNTS.map((account, index) =>
        pipe(
          // Add delay before each account (except first) to avoid rate limiting
          index > 0 ? Effect.sleep("200 millis") : Effect.void,
          Effect.flatMap(() => getAccountPortfolio(account)),
        )
      ),
      { concurrency: 1 }, // Sequential to minimize rate limiting
    ),
    Effect.map((allAccounts) => {
      // Separate "other" accounts from main fund accounts
      const accounts = allAccounts.filter(account => account.type !== "other");
      const otherAccounts = allAccounts.filter(account => account.type === "other");

      // Calculate aggregated totals (excluding "other" accounts)
      const aggregatedTotals = accounts.reduce(
        (totals, account) => ({
          totalEURMTL: totals.totalEURMTL + account.totalEURMTL,
          totalXLM: totals.totalXLM + account.totalXLM,
          nominalEURMTL: totals.nominalEURMTL + account.nominalEURMTL,
          nominalXLM: totals.nominalXLM + account.nominalXLM,
          accountCount: totals.accountCount + 1,
          tokenCount: totals.tokenCount + account.tokens.length,
        }),
        {
          totalEURMTL: 0,
          totalXLM: 0,
          nominalEURMTL: 0,
          nominalXLM: 0,
          accountCount: 0,
          tokenCount: 0,
        },
      );

      return {
        accounts,
        otherAccounts,
        aggregatedTotals,
      };
    }),
  );

const getFundAccountsImpl = (): Effect.Effect<readonly FundAccount[], never> => Effect.succeed(FUND_ACCOUNTS);

export const FundStructureServiceLive = Layer.succeed(FundStructureServiceTag, {
  getFundStructure: getFundStructureImpl,
  getFundAccounts: getFundAccountsImpl,
});
