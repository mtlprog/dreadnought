import { EnvironmentError, StellarError } from "@/lib/stellar/errors";
import type { Horizon } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import { ValidationError } from "../types";

/**
 * Find active sell offer for C-token
 */
export const findActiveSellOffer = (
  assetCode: string,
): Effect.Effect<Horizon.ServerApi.OfferRecord | null, ValidationError | EnvironmentError | StellarError> =>
  pipe(
    Effect.gen(function*() {
      const { getStellarConfig } = yield* Effect.promise(() => import("@/lib/stellar/config"));
      const config = yield* getStellarConfig();

      const crowdfundingTokenCode = `C${assetCode}`;

      // Fetch all offers from the issuer account
      const allRecords: Horizon.ServerApi.OfferRecord[] = [];
      let callBuilder = config.server.offers()
        .forAccount(config.publicKey)
        .limit(200);

      while (true) {
        const response = yield* Effect.tryPromise({
          try: () => callBuilder.call(),
          catch: (error) =>
            new ValidationError({
              field: "offers_fetch",
              message: `Failed to fetch offers: ${error}`,
            }),
        });

        allRecords.push(...response.records);

        if (response.records.length < 200) {
          break;
        }

        const lastRecord = response.records[response.records.length - 1];
        if (lastRecord === undefined) break;

        callBuilder = config.server.offers()
          .forAccount(config.publicKey)
          .cursor(lastRecord.paging_token)
          .limit(200);
      }

      // Find the sell offer for this C-token
      const offer = allRecords.find(offer =>
        offer.selling.asset_type !== "native"
        && offer.selling.asset_code === crowdfundingTokenCode
        && offer.selling.asset_issuer === config.publicKey
      );

      return offer ?? null;
    }),
    Effect.mapError((error: unknown): ValidationError | EnvironmentError | StellarError => {
      // Check if error is one of our known error types
      if (
        typeof error === "object" && error !== null && "_tag" in error
      ) {
        if (error._tag === ValidationError.prototype._tag) return error as ValidationError;
        if (error._tag === EnvironmentError.prototype._tag) return error as EnvironmentError;
        if (error._tag === StellarError.prototype._tag) return error as StellarError;
      }
      return new ValidationError({
        field: "offer",
        message: `Failed to find active sell offer: ${error}`,
      });
    }),
  );

/**
 * Calculate already sold amount from claimable balances
 */
export const calculateSoldAmount = (
  assetCode: string,
): Effect.Effect<string, ValidationError | EnvironmentError | StellarError> =>
  pipe(
    Effect.gen(function*() {
      const { getStellarConfig } = yield* Effect.promise(() => import("@/lib/stellar/config"));
      const { calculateRaisedAmount } = yield* Effect.promise(() => import("@/lib/stellar/utils"));
      const config = yield* getStellarConfig();

      // Get all claimable balances
      const allRecords: Horizon.ServerApi.ClaimableBalanceRecord[] = [];
      let callBuilder = config.server.claimableBalances()
        .claimant(config.publicKey)
        .limit(200);

      while (true) {
        const response = yield* Effect.tryPromise({
          try: () => callBuilder.call(),
          catch: (error) =>
            new ValidationError({
              field: "claimable_balances_fetch",
              message: `Failed to fetch claimable balances: ${error}`,
            }),
        });

        allRecords.push(...response.records);

        if (response.records.length < 200) {
          break;
        }

        const lastRecord = response.records[response.records.length - 1];
        if (lastRecord === undefined) break;

        callBuilder = config.server.claimableBalances()
          .claimant(config.publicKey)
          .cursor(lastRecord.paging_token)
          .limit(200);
      }

      // Calculate raised amount
      return calculateRaisedAmount(allRecords, assetCode, config.publicKey);
    }),
    Effect.mapError((error: unknown): ValidationError | EnvironmentError | StellarError => {
      // Check if error is one of our known error types
      if (
        typeof error === "object" && error !== null && "_tag" in error
      ) {
        if (error._tag === ValidationError.prototype._tag) return error as ValidationError;
        if (error._tag === EnvironmentError.prototype._tag) return error as EnvironmentError;
        if (error._tag === StellarError.prototype._tag) return error as StellarError;
      }
      return new ValidationError({
        field: "sold_amount",
        message: `Failed to calculate sold amount: ${error}`,
      });
    }),
  );
