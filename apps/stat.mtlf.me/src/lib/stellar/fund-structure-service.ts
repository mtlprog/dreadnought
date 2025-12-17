import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, pipe } from "effect";
import {
  type AssetValuationService,
  AssetValuationServiceTag,
  divideWithPrecision,
  type ResolvedAssetValuation,
} from "./asset-valuation-service";
import type { EnvironmentError, StellarError, TokenPriceError } from "./errors";
import type { ExternalPriceService } from "./external-price-service";
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
  readonly totalEURMTL: number; // Total (spot price * balance)
  readonly totalXLM: number; // Total (spot price * balance)
}

export interface FundStructureData {
  readonly accounts: readonly FundAccountPortfolio[];
  readonly otherAccounts: readonly FundAccountPortfolio[];
  readonly aggregatedTotals: {
    readonly totalEURMTL: number; // Total (spot * balance)
    readonly totalXLM: number; // Total (spot * balance)
    readonly accountCount: number;
    readonly tokenCount: number;
  };
}

export interface FundStructureService {
  readonly getFundStructure: () => Effect.Effect<
    FundStructureData,
    TokenPriceError | StellarError | EnvironmentError,
    PortfolioService | PriceService | AssetValuationService | ExternalPriceService
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

// Extract all fund account IDs for valuation lookup
const ALL_FUND_ACCOUNT_IDS = FUND_ACCOUNTS.map((account) => account.id);

/**
 * Safely parse a string to number, returns 0 for invalid values
 * Guards against NaN, Infinity, and invalid strings from external services
 */
const safeParse = (value: string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

/**
 * Safely multiply two values, returns 0 for invalid inputs
 */
const safeMultiply = (a: string | null | undefined, b: string | null | undefined): number => {
  const numA = safeParse(a);
  const numB = safeParse(b);
  const result = numA * numB;
  return Number.isFinite(result) ? result : 0;
};

const calculateAccountTotals = (
  tokens: readonly TokenPriceWithBalance[],
  xlmBalance: string,
  xlmPriceInEURMTL: string | null,
): {
  totalEURMTL: number;
  totalXLM: number;
} => {
  // Totals (spot price * balance)
  // IMPORTANT: NFTs are included in totals
  // All parsing is guarded against invalid external data (NaN, Infinity)
  const totalEURMTL = tokens.reduce((sum, token) => {
    if (token.priceInEURMTL !== null && token.priceInEURMTL !== undefined) {
      // For NFTs, use the valuation directly (balance is 0.0000001)
      if (token.isNFT) {
        return sum + safeParse(token.priceInEURMTL);
      }
      return sum + safeMultiply(token.balance, token.priceInEURMTL);
    }
    return sum;
  }, 0) + safeMultiply(xlmBalance, xlmPriceInEURMTL);

  const totalXLM = tokens.reduce((sum, token) => {
    if (token.priceInXLM !== null && token.priceInXLM !== undefined) {
      // For NFTs, use the valuation directly (balance is 0.0000001)
      if (token.isNFT) {
        return sum + safeParse(token.priceInXLM);
      }
      return sum + safeMultiply(token.balance, token.priceInXLM);
    }
    return sum;
  }, 0) + safeParse(xlmBalance);

  return { totalEURMTL, totalXLM };
};

/**
 * Apply valuation to a token (both NFT and regular assets with _1COST)
 */
const applyValuation = (
  token: TokenPriceWithBalance,
  valuations: readonly ResolvedAssetValuation[],
  xlmPriceInEURMTL: string,
  assetValuationService: AssetValuationService,
): TokenPriceWithBalance => {
  const isNFT = assetValuationService.isNFTBalance(token.balance);

  // Find valuation for this token (prefers _COST for NFT, _1COST for regular)
  const valuation = assetValuationService.findValuation(
    token.asset.code,
    valuations,
    isNFT,
  );

  if (!valuation) {
    // No manual valuation found, use market price
    return token;
  }

  // Calculate value in EURMTL based on valuation type
  const valueInEURMTL = assetValuationService.calculateValueInEURMTL(
    valuation,
    token.balance,
    isNFT,
  );

  // Convert to XLM using precision-safe division
  const valueInXLM = divideWithPrecision(valueInEURMTL, xlmPriceInEURMTL);

  // For _1COST (unit price), the priceInEURMTL is the unit price
  // For _COST (NFT total), the priceInEURMTL is the total value
  const priceInEURMTL = valuation.valuationType === "unit"
    ? valuation.valueInEURMTL
    : valueInEURMTL;

  // Convert price to XLM using precision-safe division
  const priceInXLM = divideWithPrecision(priceInEURMTL, xlmPriceInEURMTL);

  return {
    ...token,
    isNFT,
    nftValuationAccount: valuation.sourceAccount,
    priceInEURMTL,
    priceInXLM,
    valueInEURMTL,
    valueInXLM,
  };
};

const getAccountPortfolio = (
  account: FundAccount,
  allValuations: readonly ResolvedAssetValuation[],
): Effect.Effect<
  FundAccountPortfolio,
  TokenPriceError | StellarError | EnvironmentError,
  PortfolioService | PriceService | AssetValuationService | ExternalPriceService
> =>
  pipe(
    Effect.all({
      portfolioService: PortfolioServiceTag,
      priceService: PriceServiceTag,
      assetValuationService: AssetValuationServiceTag,
    }),
    Effect.flatMap(({ portfolioService, priceService, assetValuationService }) =>
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

                  // Enrich tokens with valuation data
                  // Priority: owner account values > other account values
                  const ownerValuations = allValuations.filter(
                    (v) => v.sourceAccount === account.id,
                  );
                  const otherValuations = allValuations.filter(
                    (v) => v.sourceAccount !== account.id,
                  );

                  // Build merged valuations: owner first, then others (for fallback)
                  const mergedValuations = [
                    ...ownerValuations,
                    ...otherValuations.filter((v) =>
                      !ownerValuations.some(
                        (ov) =>
                          ov.tokenCode === v.tokenCode
                          && ov.valuationType === v.valuationType,
                      )
                    ),
                  ];

                  const enrichedTokens = tokensWithPrices.map((token) =>
                    applyValuation(
                      token,
                      mergedValuations,
                      xlmPriceInEURMTL,
                      assetValuationService,
                    )
                  );

                  const { totalEURMTL, totalXLM } = calculateAccountTotals(
                    enrichedTokens,
                    portfolio.xlmBalance,
                    xlmPriceInEURMTL,
                  );

                  return {
                    ...account,
                    tokens: enrichedTokens,
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
                tokens: portfolio.tokens.map((token) => ({
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
  PortfolioService | PriceService | AssetValuationService | ExternalPriceService
> =>
  pipe(
    // First, fetch all valuations from all fund accounts
    AssetValuationServiceTag,
    Effect.flatMap((assetValuationService) =>
      pipe(
        assetValuationService.getValuationsFromAccounts(ALL_FUND_ACCOUNT_IDS),
        Effect.flatMap((rawValuations) =>
          // Resolve external price symbols (BTC, ETH, etc.) to EURMTL
          assetValuationService.resolveAllValuations(rawValuations)
        ),
        Effect.tap((valuations) => Effect.log(`Resolved ${valuations.length} asset valuations from all accounts`)),
      )
    ),
    Effect.flatMap((allValuations) =>
      pipe(
        Effect.all(
          FUND_ACCOUNTS.map((account, index) =>
            pipe(
              // Add delay before each account (except first) to avoid rate limiting
              index > 0 ? Effect.sleep("200 millis") : Effect.void,
              Effect.flatMap(() => getAccountPortfolio(account, allValuations)),
            )
          ),
          { concurrency: 1 }, // Sequential to minimize rate limiting
        ),
        Effect.map((allAccounts) => {
          // Separate "other" accounts from main fund accounts
          const accounts = allAccounts.filter((account) => account.type !== "other");
          const otherAccounts = allAccounts.filter((account) => account.type === "other");

          // Calculate aggregated totals (excluding "other" accounts)
          // Final guard: treat NaN as 0 to prevent one broken account from breaking the entire report
          const safeSum = (a: number, b: number): number => {
            const safeA = Number.isFinite(a) ? a : 0;
            const safeB = Number.isFinite(b) ? b : 0;
            return safeA + safeB;
          };

          const aggregatedTotals = accounts.reduce(
            (totals, account) => ({
              totalEURMTL: safeSum(totals.totalEURMTL, account.totalEURMTL),
              totalXLM: safeSum(totals.totalXLM, account.totalXLM),
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
            otherAccounts,
            aggregatedTotals,
          };
        }),
      )
    ),
  );

const getFundAccountsImpl = (): Effect.Effect<readonly FundAccount[], never> => Effect.succeed(FUND_ACCOUNTS);

export const FundStructureServiceLive = Layer.succeed(FundStructureServiceTag, {
  getFundStructure: getFundStructureImpl,
  getFundAccounts: getFundAccountsImpl,
});
