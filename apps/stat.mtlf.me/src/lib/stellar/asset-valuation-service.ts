import { loadAccount } from "@dreadnought/stellar-core";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig } from "./config";
import type { EnvironmentError, StellarError } from "./errors";
import { type ExternalPriceService, ExternalPriceServiceTag, type ExternalPriceSymbol } from "./external-price-service";

/**
 * Valuation type enum
 * - nft: _COST - total price for NFT (1 stroop balance)
 * - unit: _1COST - price per unit (any balance)
 */
export type ValuationType = "nft" | "unit";

/**
 * Raw valuation value (before external price resolution)
 * Can be a number (EURMTL value) or external symbol (BTC, ETH, etc.)
 */
export type ValuationValue =
  | { readonly type: "eurmtl"; readonly value: string }
  | { readonly type: "external"; readonly symbol: ExternalPriceSymbol };

/**
 * Asset valuation from account DATA entries
 * Supports both _COST (NFT total price) and _1COST (price per unit)
 */
export interface AssetValuation {
  readonly tokenCode: string;
  readonly valuationType: ValuationType;
  readonly rawValue: ValuationValue;
  readonly sourceAccount: string;
}

/**
 * Resolved asset valuation with EURMTL price
 */
export interface ResolvedAssetValuation extends AssetValuation {
  readonly valueInEURMTL: string;
}

/**
 * Service for parsing asset valuations from Stellar account DATA entries
 * Supports both _COST (NFT) and _1COST (per unit) formats
 */
export interface AssetValuationService {
  /**
   * Fetch asset valuations from a single account's DATA entries
   * Looks for entries matching patterns: {TOKEN}_COST and {TOKEN}_1COST
   *
   * @param accountId - Stellar account ID containing DATA entries
   * @returns Effect with array of asset valuations
   */
  readonly getAccountValuations: (
    accountId: string,
  ) => Effect.Effect<readonly AssetValuation[], StellarError | EnvironmentError>;

  /**
   * Fetch and merge valuations from multiple accounts
   * Owner account values take priority over others
   *
   * @param accountIds - Array of account IDs to scan
   * @param ownerAccount - Account ID that owns the assets (priority for conflicts)
   * @returns Effect with array of asset valuations (deduplicated)
   */
  readonly getValuationsFromAccounts: (
    accountIds: readonly string[],
    ownerAccount?: string,
  ) => Effect.Effect<readonly AssetValuation[], StellarError | EnvironmentError>;

  /**
   * Resolve external price symbols to EURMTL values
   *
   * @param valuation - Asset valuation to resolve
   * @returns Effect with resolved valuation (with EURMTL value)
   */
  readonly resolveValuation: (
    valuation: AssetValuation,
  ) => Effect.Effect<ResolvedAssetValuation, EnvironmentError, ExternalPriceService>;

  /**
   * Resolve all external symbols in valuations
   *
   * @param valuations - Array of valuations to resolve
   * @returns Effect with resolved valuations
   */
  readonly resolveAllValuations: (
    valuations: readonly AssetValuation[],
  ) => Effect.Effect<readonly ResolvedAssetValuation[], EnvironmentError, ExternalPriceService>;

  /**
   * Check if an asset is an NFT (balance = 0.0000001 = 1 stroop)
   *
   * @param balance - Token balance as string
   * @returns true if balance equals exactly 1 stroop
   */
  readonly isNFTBalance: (balance: string) => boolean;

  /**
   * Find valuation for a specific token code
   * Returns _COST for NFT balances, _1COST for regular balances
   *
   * @param tokenCode - Asset code to look up
   * @param valuations - Array of resolved valuations
   * @param isNFT - Whether the token has NFT balance
   * @returns Matching valuation if found, null otherwise
   */
  readonly findValuation: (
    tokenCode: string,
    valuations: readonly ResolvedAssetValuation[],
    isNFT: boolean,
  ) => ResolvedAssetValuation | null;

  /**
   * Calculate asset value in EURMTL
   * For NFTs: returns the total valuation
   * For regular assets: returns balance * unit price
   *
   * @param valuation - Resolved asset valuation
   * @param balance - Token balance
   * @param isNFT - Whether this is an NFT
   * @returns Value in EURMTL as string
   */
  readonly calculateValueInEURMTL: (
    valuation: ResolvedAssetValuation,
    balance: string,
    isNFT: boolean,
  ) => string;
}

export const AssetValuationServiceTag = Context.GenericTag<AssetValuationService>(
  "@stat.mtlf.me/AssetValuationService",
);

// 1 stroop = 0.0000001 (smallest unit in Stellar)
const NFT_BALANCE_STROOP = "0.0000001";

// Pattern suffixes for DATA entry keys
const COST_SUFFIX = "_COST"; // NFT total price
const UNIT_COST_SUFFIX = "_1COST"; // Price per unit

// Supported external price symbols
const EXTERNAL_SYMBOLS: readonly ExternalPriceSymbol[] = ["BTC", "ETH", "XLM", "Sats", "USD"];

/**
 * Normalize decimal separator (European comma to dot)
 * "0,8" -> "0.8", "1.234,56" -> "1234.56"
 */
const normalizeDecimalSeparator = (value: string): string => {
  // If contains both . and ,, assume . is thousands separator
  // e.g. "1.234,56" -> "1234.56"
  if (value.includes(".") && value.includes(",")) {
    return value.replace(/\./g, "").replace(",", ".");
  }
  // If only comma, it's a decimal separator
  // e.g. "0,8" -> "0.8"
  if (value.includes(",")) {
    return value.replace(",", ".");
  }
  return value;
};

/**
 * Parse a single DATA entry value
 * Can be a number (EURMTL) or external symbol (BTC, ETH, etc.)
 * Supports both dot and comma as decimal separators
 */
const parseValuationValue = (decodedValue: string): ValuationValue | null => {
  const trimmed = decodedValue.trim();

  // Check if it's an external symbol
  if (EXTERNAL_SYMBOLS.includes(trimmed as ExternalPriceSymbol)) {
    return {
      type: "external",
      symbol: trimmed as ExternalPriceSymbol,
    };
  }

  // Normalize decimal separator (European comma -> dot)
  const normalized = normalizeDecimalSeparator(trimmed);

  // Try to parse as number (EURMTL value)
  const numValue = parseFloat(normalized);
  if (!Number.isNaN(numValue) && numValue > 0) {
    return {
      type: "eurmtl",
      value: normalized, // Store normalized value with dot
    };
  }

  return null;
};

/**
 * Parse DATA entries from account to extract asset valuations
 *
 * @param dataEntries - Account DATA entries (base64 encoded values)
 * @param accountId - Source account ID
 * @returns Array of parsed asset valuations
 */
const parseAssetValuations = (
  dataEntries: Record<string, string>,
  accountId: string,
): readonly AssetValuation[] => {
  const valuations: AssetValuation[] = [];

  for (const [key, base64Value] of Object.entries(dataEntries)) {
    try {
      // Decode base64 value
      const decodedValue = Buffer.from(base64Value, "base64").toString("utf-8");

      // Check for _1COST first (more specific pattern)
      if (key.endsWith(UNIT_COST_SUFFIX)) {
        const tokenCode = key.slice(0, -UNIT_COST_SUFFIX.length);
        const rawValue = parseValuationValue(decodedValue);

        if (rawValue !== null) {
          valuations.push({
            tokenCode,
            valuationType: "unit",
            rawValue,
            sourceAccount: accountId,
          });
        }
        continue;
      }

      // Check for _COST (NFT total price)
      if (key.endsWith(COST_SUFFIX)) {
        const tokenCode = key.slice(0, -COST_SUFFIX.length);
        const rawValue = parseValuationValue(decodedValue);

        if (rawValue !== null) {
          valuations.push({
            tokenCode,
            valuationType: "nft",
            rawValue,
            sourceAccount: accountId,
          });
        }
      }
    } catch {
      // Skip invalid entries
      continue;
    }
  }

  return valuations;
};

const getAccountValuationsImpl = (
  accountId: string,
): Effect.Effect<readonly AssetValuation[], StellarError | EnvironmentError> =>
  pipe(
    getStellarConfig(),
    Effect.flatMap((config) => loadAccount(config.server, accountId)),
    Effect.map((account) => parseAssetValuations(account.data_attr, accountId)),
    Effect.tap((valuations) =>
      Effect.log(
        `Parsed ${valuations.length} asset valuations from account ${accountId}`,
      )
    ),
  );

const getValuationsFromAccountsImpl = (
  accountIds: readonly string[],
  ownerAccount?: string,
): Effect.Effect<readonly AssetValuation[], StellarError | EnvironmentError> =>
  pipe(
    Effect.all(
      accountIds.map((accountId) => getAccountValuationsImpl(accountId)),
      { concurrency: 3 },
    ),
    Effect.map((allValuations) => {
      const flatValuations = allValuations.flat();

      // Create map for deduplication: key = tokenCode + valuationType
      const valuationMap = new Map<string, AssetValuation>();

      for (const valuation of flatValuations) {
        const key = `${valuation.tokenCode}:${valuation.valuationType}`;
        const existing = valuationMap.get(key);

        if (!existing) {
          // First occurrence
          valuationMap.set(key, valuation);
        } else if (ownerAccount) {
          // Priority: owner account wins
          if (valuation.sourceAccount === ownerAccount) {
            valuationMap.set(key, valuation);
          }
          // If existing is from owner, keep it
        }
        // If no owner specified, keep first found (existing behavior)
      }

      return Array.from(valuationMap.values());
    }),
    Effect.tap((valuations) =>
      Effect.log(
        `Merged ${valuations.length} valuations from ${accountIds.length} accounts`,
      )
    ),
  );

const resolveValuationImpl = (
  valuation: AssetValuation,
): Effect.Effect<ResolvedAssetValuation, EnvironmentError, ExternalPriceService> => {
  if (valuation.rawValue.type === "eurmtl") {
    // Already in EURMTL, no resolution needed
    return Effect.succeed({
      ...valuation,
      valueInEURMTL: valuation.rawValue.value,
    });
  }

  // Need to fetch external price - type is "external" here
  const externalValue = valuation.rawValue;
  return pipe(
    ExternalPriceServiceTag,
    Effect.flatMap((externalPriceService) => externalPriceService.getPriceInEUR(externalValue.symbol)),
    Effect.map((priceInEUR): ResolvedAssetValuation => ({
      ...valuation,
      valueInEURMTL: priceInEUR.toString(),
    })),
    Effect.tap((resolved) =>
      Effect.log(
        `Resolved ${valuation.tokenCode} ${externalValue.symbol} -> ${resolved.valueInEURMTL} EUR`,
      )
    ),
  );
};

const resolveAllValuationsImpl = (
  valuations: readonly AssetValuation[],
): Effect.Effect<readonly ResolvedAssetValuation[], EnvironmentError, ExternalPriceService> =>
  // Sequential execution to respect CoinGecko rate limits
  // Cache will prevent duplicate API calls for same symbols
  Effect.all(valuations.map(resolveValuationImpl), { concurrency: 1 });

const isNFTBalanceImpl = (balance: string): boolean => balance === NFT_BALANCE_STROOP;

const findValuationImpl = (
  tokenCode: string,
  valuations: readonly ResolvedAssetValuation[],
  isNFT: boolean,
): ResolvedAssetValuation | null => {
  // For NFTs, prefer _COST valuation
  // For regular assets, prefer _1COST valuation
  const preferredType: ValuationType = isNFT ? "nft" : "unit";
  const fallbackType: ValuationType = isNFT ? "unit" : "nft";

  // First, try to find preferred type
  const preferred = valuations.find(
    (v) => v.tokenCode === tokenCode && v.valuationType === preferredType,
  );

  if (preferred) {
    return preferred;
  }

  // Fallback to other type
  const fallback = valuations.find(
    (v) => v.tokenCode === tokenCode && v.valuationType === fallbackType,
  );

  return fallback ?? null;
};

// Stellar uses 7 decimal places for precision
export const STELLAR_PRECISION = 7;

/**
 * Safely multiply two decimal strings with Stellar-compatible precision
 * Avoids floating-point precision errors in financial calculations
 * Returns "0" for any invalid input (NaN, Infinity, null, undefined)
 *
 * @param a - First decimal string
 * @param b - Second decimal string
 * @returns Result as string with Stellar precision, or "0" for invalid input
 */
export const multiplyWithPrecision = (a: string, b: string): string => {
  const numA = parseFloat(a);
  const numB = parseFloat(b);

  // Guard against invalid inputs from external services
  if (!Number.isFinite(numA) || !Number.isFinite(numB)) {
    return "0";
  }

  const result = numA * numB;

  // Guard against overflow/underflow
  if (!Number.isFinite(result)) {
    return "0";
  }

  // Use toFixed to control precision, then remove trailing zeros
  return parseFloat(result.toFixed(STELLAR_PRECISION)).toString();
};

/**
 * Safely divide two decimal strings with Stellar-compatible precision
 * Avoids floating-point precision errors in financial calculations
 * Returns "0" for any invalid input (NaN, Infinity, zero divisor)
 *
 * @param a - Dividend as decimal string
 * @param b - Divisor as decimal string
 * @returns Result as string with Stellar precision, or "0" for invalid input
 */
export const divideWithPrecision = (a: string, b: string): string => {
  const numA = parseFloat(a);
  const numB = parseFloat(b);

  // Guard against invalid inputs from external services
  if (!Number.isFinite(numA) || !Number.isFinite(numB)) {
    return "0";
  }

  // Guard against division by zero
  if (numB === 0) {
    return "0";
  }

  const result = numA / numB;

  // Guard against overflow/underflow
  if (!Number.isFinite(result)) {
    return "0";
  }

  return parseFloat(result.toFixed(STELLAR_PRECISION)).toString();
};

const calculateValueInEURMTLImpl = (
  valuation: ResolvedAssetValuation,
  balance: string,
  isNFT: boolean,
): string => {
  const eurmtlValue = parseFloat(valuation.valueInEURMTL);

  // Guard against invalid valuation from external services
  if (!Number.isFinite(eurmtlValue)) {
    return "0";
  }

  if (isNFT || valuation.valuationType === "nft") {
    // For NFTs, the valuation is the total price
    // Use toFixed to ensure consistent precision
    return parseFloat(eurmtlValue.toFixed(STELLAR_PRECISION)).toString();
  }

  // For regular assets, multiply by balance with proper precision
  // multiplyWithPrecision already handles invalid inputs
  return multiplyWithPrecision(balance, valuation.valueInEURMTL);
};

export const AssetValuationServiceLive = Layer.succeed(AssetValuationServiceTag, {
  getAccountValuations: getAccountValuationsImpl,
  getValuationsFromAccounts: getValuationsFromAccountsImpl,
  resolveValuation: resolveValuationImpl,
  resolveAllValuations: resolveAllValuationsImpl,
  isNFTBalance: isNFTBalanceImpl,
  findValuation: findValuationImpl,
  calculateValueInEURMTL: calculateValueInEURMTLImpl,
});
