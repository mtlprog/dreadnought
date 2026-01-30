import { EnvironmentError, StellarError } from "@/lib/stellar/errors";
import type { SupporterContribution } from "@/lib/stellar/types";
import { collectSupportersData, enrichSupportersWithNames } from "@/lib/stellar/utils";
import type { Horizon } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import { ValidationError } from "../types";
import { calculateSoldAmount, findActiveSellOffer } from "./offer";

export interface FundingData {
  readonly funded_amount: string;
  readonly supporters_count: number;
  readonly supporters: readonly SupporterContribution[];
  readonly remaining_amount: string;
  readonly funding_status: "completed" | "canceled";
}

/**
 * Get historical funding data from Horizon API payment operations
 * Used when project is closed and claimable balances/token holders are no longer available
 */
export const getHistoricalFundingData = (
  assetCode: string,
  targetAmount: string,
): Effect.Effect<FundingData, ValidationError | EnvironmentError | StellarError> =>
  pipe(
    Effect.gen(function*() {
      const { getStellarConfig } = yield* Effect.promise(() => import("@/lib/stellar/config"));
      const config = yield* getStellarConfig();
      const crowdfundingAssetCode = `C${assetCode}`;

      yield* Effect.logInfo(`Fetching historical trades for ${crowdfundingAssetCode}...`);

      // Fetch all trades where C-token was sold (issuer sold C-token, got MTLCrowd)
      const allTrades: Horizon.ServerApi.TradeRecord[] = [];
      const { Asset } = yield* Effect.promise(() => import("@stellar/stellar-sdk"));
      const crowdfundingAsset = new Asset(crowdfundingAssetCode, config.publicKey);

      let callBuilder = config.server.trades()
        .forAssetPair(crowdfundingAsset, config.mtlCrowdAsset)
        .order("desc")
        .limit(200);

      while (true) {
        const response = yield* Effect.tryPromise({
          try: () => callBuilder.call(),
          catch: (error) =>
            new StellarError({
              cause: error,
              operation: "fetch_trades",
            }),
        });

        allTrades.push(...response.records);

        // If we got fewer records than the limit, we've reached the end
        if (response.records.length < 200) {
          break;
        }

        const lastRecord = response.records[response.records.length - 1];
        if (lastRecord === undefined) break;

        callBuilder = config.server.trades()
          .forAssetPair(crowdfundingAsset, config.mtlCrowdAsset)
          .cursor(lastRecord.paging_token)
          .order("desc")
          .limit(200);
      }

      yield* Effect.logInfo(`Found ${allTrades.length} total trades`);

      // Calculate from trades
      const supportersMap = new Map<string, number>();
      let totalFunded = 0;

      for (const trade of allTrades) {
        // Trades where issuer SOLD C-token (base) and RECEIVED MTLCrowd (counter)
        // base_account = issuer (seller), counter_account = supporter (buyer)
        if (
          trade.base_account === config.publicKey
          && trade.counter_account !== undefined
          && trade.base_amount !== undefined
        ) {
          // This is a trade where issuer sold C-token
          const supporter = trade.counter_account;
          const amount = parseFloat(trade.base_amount); // Amount of C-tokens sold = amount funded

          totalFunded += amount;

          const currentAmount = supportersMap.get(supporter) ?? 0;
          supportersMap.set(supporter, currentAmount + amount);
        }
      }

      const fundedAmount = totalFunded.toString();
      const remainingAmount = (parseFloat(targetAmount) - totalFunded).toString();
      const fundingStatus: "completed" | "canceled" = totalFunded >= parseFloat(targetAmount)
        ? "completed"
        : "canceled";

      const supportersBase: SupporterContribution[] = Array.from(supportersMap.entries())
        .map(([account_id, amount]) => ({
          account_id,
          amount: amount.toString(),
        }))
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

      yield* Effect.logInfo(
        `Calculated: funded=${fundedAmount}, supporters=${supportersBase.length}, status=${fundingStatus}`,
      );

      // Enrich supporters with account names
      yield* Effect.logInfo("Enriching supporters with account names...");
      const supporters = yield* enrichSupportersWithNames(config, supportersBase);

      return {
        funded_amount: fundedAmount,
        supporters_count: supporters.length,
        supporters,
        remaining_amount: remainingAmount,
        funding_status: fundingStatus,
      };
    }),
    Effect.mapError((error: unknown): ValidationError | EnvironmentError | StellarError => {
      if (
        typeof error === "object" && error !== null && "_tag" in error
      ) {
        if (error._tag === ValidationError.prototype._tag) return error as ValidationError;
        if (error._tag === EnvironmentError.prototype._tag) return error as EnvironmentError;
        if (error._tag === StellarError.prototype._tag) return error as StellarError;
      }
      return new StellarError({
        cause: error,
        operation: "get_historical_funding_data",
      });
    }),
  );

/**
 * Get current funding data from active project state
 * Uses claimable balances, token holders, and active sell offers
 */
export const getCurrentFundingData = (
  assetCode: string,
  _targetAmount: string,
): Effect.Effect<FundingData, ValidationError | EnvironmentError | StellarError> =>
  pipe(
    Effect.gen(function*() {
      const { getStellarConfig } = yield* Effect.promise(() => import("@/lib/stellar/config"));
      const config = yield* getStellarConfig();

      yield* Effect.logInfo(`Fetching current state for C${assetCode}...`);

      // Get claimable balances filtered by C-token
      const crowdfundingTokenCode = `C${assetCode}`;
      const claimableBalances = yield* Effect.tryPromise({
        try: async () => {
          const allRecords: Horizon.ServerApi.ClaimableBalanceRecord[] = [];
          let callBuilder = config.server.claimableBalances()
            .claimant(config.publicKey)
            .limit(200);

          while (true) {
            const response = await callBuilder.call();
            allRecords.push(...response.records);

            if (response.records.length < 200) break;

            const lastRecord = response.records[response.records.length - 1];
            if (lastRecord === undefined) break;

            callBuilder = config.server.claimableBalances()
              .claimant(config.publicKey)
              .cursor(lastRecord.paging_token)
              .limit(200);
          }

          // Filter by C-token of this project
          return allRecords.filter(balance => {
            const asset = balance.asset;
            return asset !== "native" && asset.split(":")[0] === crowdfundingTokenCode;
          });
        },
        catch: (error) =>
          new StellarError({
            cause: error,
            operation: "get_claimable_balances",
          }),
      });

      // Collect supporters data from claimable balances only (real supporters)
      const supportersData = collectSupportersData(
        claimableBalances,
        assetCode,
        config.publicKey,
      );

      // Calculate funded amount
      const fundedAmount = yield* calculateSoldAmount(assetCode);

      // Get remaining amount from active offer
      const activeOffer = yield* pipe(
        findActiveSellOffer(assetCode),
        Effect.catchAll(() => Effect.succeed(null)),
      );

      const remainingAmount = activeOffer !== null ? activeOffer.amount : "0";
      const fundingStatus: "completed" | "canceled" = parseFloat(remainingAmount) === 0
        ? "completed"
        : "canceled";

      yield* Effect.logInfo(
        `Current state: funded=${fundedAmount}, supporters=${supportersData.length}, remaining=${remainingAmount}`,
      );

      // Enrich supporters with account names
      yield* Effect.logInfo("Enriching supporters with account names...");
      const supporters = yield* enrichSupportersWithNames(config, supportersData);

      return {
        funded_amount: fundedAmount,
        supporters_count: supporters.length,
        supporters,
        remaining_amount: remainingAmount,
        funding_status: fundingStatus,
      };
    }),
    Effect.mapError((error: unknown): ValidationError | EnvironmentError | StellarError => {
      if (
        typeof error === "object" && error !== null && "_tag" in error
      ) {
        if (error._tag === ValidationError.prototype._tag) return error as ValidationError;
        if (error._tag === EnvironmentError.prototype._tag) return error as EnvironmentError;
        if (error._tag === StellarError.prototype._tag) return error as StellarError;
      }
      return new StellarError({
        cause: error,
        operation: "get_current_funding_data",
      });
    }),
  );
