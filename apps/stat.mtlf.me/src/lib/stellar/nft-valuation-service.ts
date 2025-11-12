import { loadAccount } from "@dreadnought/stellar-core";
import { Context, Effect, Layer, pipe } from "effect";
import type { EnvironmentError, StellarError } from "./errors";
import { getStellarConfig } from "./config";

/**
 * NFT valuation from account DATA entries
 * Format: {TOKEN}_COST with value in EURMTL
 */
export interface NFTValuation {
  readonly tokenCode: string;
  readonly valueInEURMTL: string;
  readonly sourceAccount: string;
}

/**
 * Service for parsing NFT valuations from Stellar account DATA entries
 */
export interface NFTValuationService {
  /**
   * Fetch NFT valuations from the specified account's DATA entries
   * Looks for entries matching pattern: {TOKEN}_COST with EURMTL values
   *
   * @param accountId - Stellar account ID containing DATA entries
   * @returns Effect with array of NFT valuations
   */
  readonly getNFTValuations: (
    accountId: string,
  ) => Effect.Effect<readonly NFTValuation[], StellarError | EnvironmentError>;

  /**
   * Check if an asset is an NFT (balance = 0.0000001 = 1 stroop)
   *
   * @param balance - Token balance as string
   * @returns true if balance equals exactly 1 stroop
   */
  readonly isNFTBalance: (balance: string) => boolean;

  /**
   * Find NFT valuation for a specific token code
   *
   * @param tokenCode - Asset code to look up
   * @param valuations - Array of NFT valuations
   * @returns NFT valuation if found, null otherwise
   */
  readonly findNFTValuation: (
    tokenCode: string,
    valuations: readonly NFTValuation[],
  ) => NFTValuation | null;
}

export const NFTValuationServiceTag = Context.GenericTag<NFTValuationService>(
  "@stat.mtlf.me/NFTValuationService",
);

// 1 stroop = 0.0000001 (smallest unit in Stellar)
const NFT_BALANCE_STROOP = "0.0000001";

// Pattern for DATA entry keys: {TOKEN}_COST
const COST_SUFFIX = "_COST";

/**
 * Parse DATA entries from account to extract NFT valuations
 *
 * @param dataEntries - Account DATA entries (base64 encoded values)
 * @param accountId - Source account ID
 * @returns Array of parsed NFT valuations
 */
const parseNFTValuations = (
  dataEntries: Record<string, string>,
  accountId: string,
): readonly NFTValuation[] => {
  const valuations: NFTValuation[] = [];

  for (const [key, base64Value] of Object.entries(dataEntries)) {
    if (key.endsWith(COST_SUFFIX)) {
      try {
        // Extract token code by removing _COST suffix
        const tokenCode = key.slice(0, -COST_SUFFIX.length);

        // Decode base64 value to get EURMTL amount
        const decodedValue = Buffer.from(base64Value, "base64").toString("utf-8");

        // Validate it's a number
        const valueInEURMTL = parseFloat(decodedValue);
        if (!Number.isNaN(valueInEURMTL) && valueInEURMTL > 0) {
          valuations.push({
            tokenCode,
            valueInEURMTL: decodedValue,
            sourceAccount: accountId,
          });
        }
      } catch {
        // Skip invalid entries
        continue;
      }
    }
  }

  return valuations;
};

const getNFTValuationsImpl = (
  accountId: string,
): Effect.Effect<readonly NFTValuation[], StellarError | EnvironmentError> =>
  pipe(
    getStellarConfig(),
    Effect.flatMap((config) => loadAccount(config.server, accountId)),
    Effect.map((account) => parseNFTValuations(account.data_attr, accountId)),
    Effect.tap((valuations) =>
      Effect.log(
        `Parsed ${valuations.length} NFT valuations from account ${accountId}`,
      ),
    ),
  );

const isNFTBalanceImpl = (balance: string): boolean =>
  balance === NFT_BALANCE_STROOP;

const findNFTValuationImpl = (
  tokenCode: string,
  valuations: readonly NFTValuation[],
): NFTValuation | null => {
  const found = valuations.find(
    (valuation) => valuation.tokenCode === tokenCode,
  );
  return found ?? null;
};

export const NFTValuationServiceLive = Layer.succeed(NFTValuationServiceTag, {
  getNFTValuations: getNFTValuationsImpl,
  isNFTBalance: isNFTBalanceImpl,
  findNFTValuation: findNFTValuationImpl,
});
