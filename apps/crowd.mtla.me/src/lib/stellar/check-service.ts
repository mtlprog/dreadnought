import {
  Asset,
  BASE_FEE,
  Claimant,
  type Horizon,
  Operation,
  TimeoutInfinite,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig, type StellarConfig } from "./config";
import { StellarError, type StellarServiceError } from "./errors";
import type { ProjectData } from "./types";
import { fetchProjectDataFromIPFS, isProjectExpired } from "./utils";

interface TokenHolder {
  readonly accountId: string;
  readonly balance: string;
}

export interface ProjectCheckResult {
  readonly code: string;
  readonly name: string;
  readonly deadline: string;
  readonly targetAmount: string;
  readonly currentAmount: string;
  readonly isExpired: boolean;
  readonly isGoalReached: boolean;
  readonly transactionXDR?: string;
  readonly action: "refund" | "fund_project" | "no_action" | "cleanup_trustlines";
  readonly claimableBalancesCount: number;
  readonly tokenHoldersCount: number;
  readonly claimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[];
  readonly tokenHolders: readonly TokenHolder[];
  readonly orphanedTrustlinesCount?: number;
  readonly orphanedTrustlineAccounts?: readonly string[];
  readonly isClosed?: boolean;
  readonly error?: string;
}

export interface StellarCheckService {
  readonly checkAllProjects: () => Effect.Effect<ProjectCheckResult[], StellarServiceError>;
}

export const StellarCheckServiceTag = Context.GenericTag<StellarCheckService>(
  "@crowd.mtla.me/StellarCheckService",
);

const getClaimableBalancesForProject = (
  server: Horizon.Server,
  accountId: string,
  assetCode: string,
): Effect.Effect<readonly Horizon.ServerApi.ClaimableBalanceRecord[], StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const allRecords: Horizon.ServerApi.ClaimableBalanceRecord[] = [];
        let callBuilder = server.claimableBalances()
          .claimant(accountId)
          .limit(200); // Maximum allowed per request

        // Fetch all pages using pagination
        while (true) {
          const response = await callBuilder.call();
          allRecords.push(...response.records);

          // If we got fewer records than the limit, we've reached the end
          if (response.records.length < 200) {
            break;
          }

          // Prepare next page request
          const lastRecord = response.records[response.records.length - 1];
          if (lastRecord === undefined) break; // Safety check

          callBuilder = server.claimableBalances()
            .claimant(accountId)
            .cursor(lastRecord.paging_token)
            .limit(200);
        }

        const crowdfundingTokenCode = `C${assetCode}`;
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
    }),
  );

const getTokenHolders = (
  config: StellarConfig,
  assetCode: string,
): Effect.Effect<readonly TokenHolder[], StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const crowdfundingTokenCode = `C${assetCode}`;
        const holders: TokenHolder[] = [];

        try {
          // Get all accounts holding this asset using pagination
          const allAccounts: Horizon.ServerApi.AccountRecord[] = [];
          let callBuilder = config.server.accounts()
            .forAsset(new Asset(crowdfundingTokenCode, config.publicKey))
            .limit(200); // Maximum allowed per request

          // Fetch all pages using pagination
          while (true) {
            const response = await callBuilder.call();
            allAccounts.push(...response.records);

            // If we got fewer records than the limit, we've reached the end
            if (response.records.length < 200) {
              break;
            }

            // Prepare next page request
            const lastRecord = response.records[response.records.length - 1];
            if (lastRecord === undefined) break; // Safety check

            callBuilder = config.server.accounts()
              .forAsset(new Asset(crowdfundingTokenCode, config.publicKey))
              .cursor(lastRecord.paging_token)
              .limit(200);
          }

          for (const account of allAccounts) {
            for (const balance of account.balances) {
              if (
                balance.asset_type !== "native"
                && balance.asset_type !== "liquidity_pool_shares"
                && "asset_code" in balance
                && "asset_issuer" in balance
                && balance.asset_code === crowdfundingTokenCode
                && balance.asset_issuer === config.publicKey
                && parseFloat(balance.balance) > 0
              ) {
                holders.push({
                  accountId: account.id,
                  balance: balance.balance,
                });
              }
            }
          }
        } catch {
          // If asset doesn't exist or no holders, that's fine - return empty array
        }

        return holders;
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "get_token_holders",
        }),
    }),
  );

const getAllAccountsWithTrustlines = (
  config: StellarConfig,
  assetCode: string,
): Effect.Effect<readonly string[], StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const crowdfundingTokenCode = `C${assetCode}`;
        const accountsWithTrustlines: string[] = [];

        try {
          // Get all accounts with trustlines to this asset (including 0 balance)
          const allAccounts: Horizon.ServerApi.AccountRecord[] = [];
          let callBuilder = config.server.accounts()
            .forAsset(new Asset(crowdfundingTokenCode, config.publicKey))
            .limit(200); // Maximum allowed per request

          // Fetch all pages using pagination
          while (true) {
            const response = await callBuilder.call();
            allAccounts.push(...response.records);

            // If we got fewer records than the limit, we've reached the end
            if (response.records.length < 200) {
              break;
            }

            // Prepare next page request
            const lastRecord = response.records[response.records.length - 1];
            if (lastRecord === undefined) break; // Safety check

            callBuilder = config.server.accounts()
              .forAsset(new Asset(crowdfundingTokenCode, config.publicKey))
              .cursor(lastRecord.paging_token)
              .limit(200);
          }

          for (const account of allAccounts) {
            for (const balance of account.balances) {
              if (
                balance.asset_type !== "native"
                && balance.asset_type !== "liquidity_pool_shares"
                && "asset_code" in balance
                && "asset_issuer" in balance
                && balance.asset_code === crowdfundingTokenCode
                && balance.asset_issuer === config.publicKey
              ) {
                // Add account regardless of balance (including 0)
                accountsWithTrustlines.push(account.id);
                break; // Only add once per account
              }
            }
          }
        } catch {
          // If asset doesn't exist or no trustlines, return empty array
        }

        return accountsWithTrustlines;
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "get_all_accounts_with_trustlines",
        }),
    }),
  );

const calculateCurrentAmount = (
  claimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[],
  tokenHolders: readonly TokenHolder[],
): string => {
  let totalAmount = 0;

  // Add claimable balances
  for (const balance of claimableBalances) {
    totalAmount += parseFloat(balance.amount);
  }

  // Add token holders' balances
  for (const holder of tokenHolders) {
    totalAmount += parseFloat(holder.balance);
  }

  return totalAmount.toString();
};

const checkProjectTrustline = (
  config: StellarConfig,
  projectAccountId: string,
): Effect.Effect<boolean, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const account = await config.server.loadAccount(projectAccountId);

        // Check if project account has trustline to MTLCrowd token
        for (const balance of account.balances) {
          if (
            balance.asset_type !== "native"
            && balance.asset_type !== "liquidity_pool_shares"
            && "asset_code" in balance
            && "asset_issuer" in balance
            && balance.asset_code === config.mtlCrowdAsset.code
            && balance.asset_issuer === config.mtlCrowdAsset.issuer
          ) {
            return true;
          }
        }
        return false;
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "check_trustline",
        }),
    }),
  );

const createOfferCancellationTransaction = (
  config: StellarConfig,
  assetCode: string,
  activeOffers: readonly Horizon.ServerApi.OfferRecord[],
): Effect.Effect<string, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const sourceAccount = await config.server.loadAccount(config.publicKey);
        const mtlCrowdAsset = config.mtlCrowdAsset;
        const crowdfundingAsset = new Asset(`C${assetCode}`, config.publicKey);

        const transactionBuilder = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase: config.networkPassphrase,
        });

        // Cancel active offers for this C-token
        const crowdfundingTokenCode = `C${assetCode}`;
        let offersCancelled = 0;

        for (const offer of activeOffers) {
          if (
            offer.selling.asset_type !== "native"
            && offer.selling.asset_code === crowdfundingTokenCode
            && offer.selling.asset_issuer === config.publicKey
          ) {
            transactionBuilder.addOperation(Operation.manageSellOffer({
              selling: crowdfundingAsset,
              buying: mtlCrowdAsset,
              amount: "0", // Cancel offer
              price: offer.price,
              offerId: offer.id,
            }));
            offersCancelled++;
          }
        }

        if (offersCancelled === 0) {
          throw new Error(`No offers found to cancel for ${crowdfundingTokenCode}`);
        }

        return transactionBuilder
          .setTimeout(TimeoutInfinite)
          .build()
          .toXDR();
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "create_offer_cancellation_transaction",
        }),
    }),
  );

const createRefundTransaction = (
  config: StellarConfig,
  assetCode: string,
  claimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[],
  tokenHolders: readonly TokenHolder[],
  activeOffers: readonly Horizon.ServerApi.OfferRecord[],
  allTrustlineAccounts: readonly string[],
): Effect.Effect<string, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const sourceAccount = await config.server.loadAccount(config.publicKey);
        const mtlCrowdAsset = config.mtlCrowdAsset;
        const crowdfundingAsset = new Asset(`C${assetCode}`, config.publicKey);

        const transactionBuilder = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase: config.networkPassphrase,
        });

        // Claim all C-token claimable balances
        for (const balance of claimableBalances) {
          transactionBuilder.addOperation(Operation.claimClaimableBalance({
            balanceId: balance.id,
          }));
        }

        // Clawback C-tokens held by users (tokens will be burned automatically when returned to issuer)
        for (const holder of tokenHolders) {
          if (holder.accountId !== config.publicKey) { // Don't clawback from issuer
            transactionBuilder.addOperation(Operation.clawback({
              asset: crowdfundingAsset,
              from: holder.accountId,
              amount: holder.balance,
            }));
          }
        }

        // All C-tokens will be automatically burned when returned to issuer
        // Total: claimableBalances + tokenHolders = all C-tokens in circulation

        // Revoke authorization for ALL accounts with trustlines (including those with 0 balance)
        // This prevents orphaned trustlines from remaining active after project closure
        for (const accountId of allTrustlineAccounts) {
          if (accountId !== config.publicKey) {
            transactionBuilder.addOperation(Operation.setTrustLineFlags({
              trustor: accountId,
              asset: crowdfundingAsset,
              flags: {
                authorized: false,
              },
            }));
          }
        }

        // Calculate total refunds needed
        const supporterRefunds = new Map<string, number>();

        // Add refunds from claimable balances
        for (const balance of claimableBalances) {
          const sponsor = balance.sponsor;
          if (sponsor !== undefined && sponsor !== null) {
            const amount = parseFloat(balance.amount);
            supporterRefunds.set(sponsor, (supporterRefunds.get(sponsor) ?? 0) + amount);
          }
        }

        // Add refunds from token holders
        for (const holder of tokenHolders) {
          if (holder.accountId !== config.publicKey) {
            const amount = parseFloat(holder.balance);
            supporterRefunds.set(holder.accountId, (supporterRefunds.get(holder.accountId) ?? 0) + amount);
          }
        }

        // Send MTLCrowd back to each supporter (1:1 ratio)
        for (const [supporter, amount] of supporterRefunds) {
          transactionBuilder.addOperation(Operation.payment({
            destination: supporter,
            asset: mtlCrowdAsset,
            amount: amount.toString(),
          }));
        }

        // Cancel active offers for this C-token
        const crowdfundingTokenCode = `C${assetCode}`;
        for (const offer of activeOffers) {
          if (
            offer.selling.asset_type !== "native"
            && offer.selling.asset_code === crowdfundingTokenCode
            && offer.selling.asset_issuer === config.publicKey
          ) {
            transactionBuilder.addOperation(Operation.manageSellOffer({
              selling: crowdfundingAsset,
              buying: mtlCrowdAsset,
              amount: "0", // Cancel offer
              price: offer.price,
              offerId: offer.id,
            }));
          }
        }

        return transactionBuilder
          .setTimeout(TimeoutInfinite)
          .build()
          .toXDR();
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "create_refund_transaction",
        }),
    }),
  );

const createFundingTransaction = (
  config: StellarConfig,
  assetCode: string,
  projectAccountId: string,
  claimableBalances: readonly Horizon.ServerApi.ClaimableBalanceRecord[],
  tokenHolders: readonly TokenHolder[],
  hasTrustline: boolean,
  allTrustlineAccounts: readonly string[],
): Effect.Effect<string, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const sourceAccount = await config.server.loadAccount(config.publicKey);
        const mtlCrowdAsset = config.mtlCrowdAsset;
        const crowdfundingAsset = new Asset(`C${assetCode}`, config.publicKey);

        const transactionBuilder = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase: config.networkPassphrase,
        });

        // Claim ALL claimable balances (even if over target)
        for (const balance of claimableBalances) {
          transactionBuilder.addOperation(Operation.claimClaimableBalance({
            balanceId: balance.id,
          }));
        }

        // Clawback all C-tokens held by users (tokens will be burned automatically when returned to issuer)
        for (const holder of tokenHolders) {
          if (holder.accountId !== config.publicKey) {
            transactionBuilder.addOperation(Operation.clawback({
              asset: crowdfundingAsset,
              from: holder.accountId,
              amount: holder.balance,
            }));
          }
        }

        // All C-tokens will be automatically burned when returned to issuer
        // Total: claimableBalances + tokenHolders = all C-tokens in circulation

        // Revoke authorization for ALL accounts with trustlines (including those with 0 balance)
        // This prevents orphaned trustlines from remaining active after project closure
        for (const accountId of allTrustlineAccounts) {
          if (accountId !== config.publicKey) {
            transactionBuilder.addOperation(Operation.setTrustLineFlags({
              trustor: accountId,
              asset: crowdfundingAsset,
              flags: {
                authorized: false,
              },
            }));
          }
        }

        // Calculate total collected amount
        let totalCollected = 0;
        for (const balance of claimableBalances) {
          totalCollected += parseFloat(balance.amount);
        }
        for (const holder of tokenHolders) {
          if (holder.accountId !== config.publicKey) {
            totalCollected += parseFloat(holder.balance);
          }
        }

        // Send MTLCrowd to project account
        if (hasTrustline) {
          // Direct payment if trustline exists
          transactionBuilder.addOperation(Operation.payment({
            destination: projectAccountId,
            asset: mtlCrowdAsset,
            amount: totalCollected.toString(),
          }));
        } else {
          // Create claimable balance if no trustline
          transactionBuilder.addOperation(Operation.createClaimableBalance({
            asset: mtlCrowdAsset,
            amount: totalCollected.toString(),
            claimants: [
              new Claimant(projectAccountId),
            ],
          }));
        }

        return transactionBuilder
          .setTimeout(TimeoutInfinite)
          .build()
          .toXDR();
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "create_funding_transaction",
        }),
    }),
  );

const checkSingleProject = (
  config: StellarConfig,
  project: {
    code: string;
    name: string;
    deadline: string;
    target_amount: string;
    project_account_id: string;
    funding_status?: "completed" | "canceled";
  },
  activeOffers: readonly Horizon.ServerApi.OfferRecord[],
): Effect.Effect<ProjectCheckResult, never> =>
  pipe(
    Effect.gen(function*() {
      const isExpired = isProjectExpired(project.deadline);

      const now = new Date().toISOString().split("T")[0];
      yield* Effect.logInfo(`🔍 Checking project ${project.code} (${project.name})`);
      yield* Effect.logInfo(`  Today: ${now}, Deadline: ${project.deadline}, Expired: ${isExpired}`);
      yield* Effect.logInfo(`  Target: ${project.target_amount} ${config.mtlCrowdAsset.code}`);
      if (project.funding_status !== undefined) {
        yield* Effect.logInfo(`  Funding status: ${project.funding_status}`);
      }

      // Always check claimable balances and token holders first
      const claimableBalances = yield* pipe(
        getClaimableBalancesForProject(
          config.server,
          config.publicKey,
          project.code,
        ),
        Effect.catchAll(() => Effect.succeed([] as readonly Horizon.ServerApi.ClaimableBalanceRecord[])),
      );

      const tokenHolders = yield* pipe(
        getTokenHolders(
          config,
          project.code,
        ),
        Effect.catchAll(() => Effect.succeed([] as readonly TokenHolder[])),
      );

      const currentAmount = calculateCurrentAmount(claimableBalances, tokenHolders);
      const currentAmountNum = parseFloat(currentAmount);
      const targetAmountNum = parseFloat(project.target_amount);
      const isGoalReached = currentAmountNum >= targetAmountNum;

      yield* Effect.logInfo(`  Current: ${currentAmount} ${config.mtlCrowdAsset.code}, Goal reached: ${isGoalReached}`);
      yield* Effect.logInfo(`  Claimable balances: ${claimableBalances.length}, Token holders: ${tokenHolders.length}`);

      // Determine if project is closed
      // Criteria: Has funding_status in IPFS AND (expired or goal reached) AND no balances/holders
      const hasBalancesOrHolders = claimableBalances.length > 0 || tokenHolders.length > 0;
      const isClosed = project.funding_status !== undefined && (isExpired || isGoalReached) && !hasBalancesOrHolders;

      yield* Effect.logInfo(`  🔍 isClosed check:`);
      yield* Effect.logInfo(`    - has funding_status: ${project.funding_status !== undefined}`);
      yield* Effect.logInfo(`    - isExpired: ${isExpired}, isGoalReached: ${isGoalReached}`);
      yield* Effect.logInfo(`    - hasBalancesOrHolders: ${hasBalancesOrHolders}`);
      yield* Effect.logInfo(`    - isClosed: ${isClosed}`);

      // If goal is reached, process immediately regardless of deadline
      if (isGoalReached) {
        yield* Effect.logInfo(`  ✅ Goal reached! Processing funding transaction...`);
      } else if (isExpired) {
        yield* Effect.logInfo(`  ⏰ Project expired. Processing refund transaction...`);
      } else {
        yield* Effect.logInfo(`  ⏳ Project still active, no action needed.`);
        return {
          code: project.code,
          name: project.name,
          deadline: project.deadline,
          targetAmount: project.target_amount,
          currentAmount,
          isExpired: false,
          isGoalReached,
          action: "no_action" as const,
          claimableBalancesCount: claimableBalances.length,
          tokenHoldersCount: tokenHolders.length,
          claimableBalances,
          tokenHolders,
          isClosed: false,
        };
      }

      // Check if there's an active offer for this project that needs to be cancelled
      const crowdfundingTokenCode = `C${project.code}`;
      const hasActiveOffer = activeOffers.some(offer =>
        offer.selling.asset_type !== "native"
        && offer.selling.asset_code === crowdfundingTokenCode
        && offer.selling.asset_issuer === config.publicKey
      );

      // Check if there's anything to process
      // const hasBalancesOrHolders already defined above

      // If project is closed, check for orphaned trustlines
      if (isClosed) {
        yield* Effect.logInfo(`  🔒 Project is closed. Checking for orphaned trustlines...`);

        // Get all accounts with trustlines to this C-token
        const allAccountsWithTrustlines = yield* pipe(
          getAllAccountsWithTrustlines(config, project.code),
          Effect.catchAll(() => Effect.succeed([] as readonly string[])),
        );

        yield* Effect.logInfo(
          `  📋 All accounts with C${project.code} trustlines: ${allAccountsWithTrustlines.length}`,
        );
        for (const accountId of allAccountsWithTrustlines) {
          yield* Effect.logInfo(`    - ${accountId}`);
        }

        // Collect accounts that SHOULD have trustlines (sponsors + holders)
        const expectedAccounts = new Set<string>();
        for (const balance of claimableBalances) {
          if (balance.sponsor !== undefined && balance.sponsor !== null) {
            expectedAccounts.add(balance.sponsor);
          }
        }
        for (const holder of tokenHolders) {
          expectedAccounts.add(holder.accountId);
        }

        yield* Effect.logInfo(`  ✅ Expected accounts (should have trustlines): ${expectedAccounts.size}`);
        for (const accountId of expectedAccounts) {
          yield* Effect.logInfo(`    - ${accountId}`);
        }

        // Find orphaned trustlines (accounts with trustlines that shouldn't have them)
        const orphanedAccounts = allAccountsWithTrustlines.filter(
          accountId => !expectedAccounts.has(accountId) && accountId !== config.publicKey,
        );

        if (orphanedAccounts.length > 0) {
          yield* Effect.logInfo(`  ⚠️ Found ${orphanedAccounts.length} orphaned trustline(s)!`);
          for (const accountId of orphanedAccounts) {
            yield* Effect.logInfo(`    - ${accountId}`);
          }

          // Don't create transaction here - it will be created in CLI with fresh account
          yield* Effect.logInfo(`  ℹ️ Trustline cleanup needed.`);
          return {
            code: project.code,
            name: project.name,
            deadline: project.deadline,
            targetAmount: project.target_amount,
            currentAmount,
            isExpired,
            isGoalReached,
            action: "cleanup_trustlines" as const,
            claimableBalancesCount: claimableBalances.length,
            tokenHoldersCount: tokenHolders.length,
            claimableBalances,
            tokenHolders,
            orphanedTrustlinesCount: orphanedAccounts.length,
            orphanedTrustlineAccounts: orphanedAccounts,
            isClosed: true,
          };
        } else {
          yield* Effect.logInfo(`  ✅ No orphaned trustlines found.`);
        }
      }

      if (!hasBalancesOrHolders && !hasActiveOffer) {
        yield* Effect.logInfo(`  ℹ️ No claimable balances, token holders, or active offers found.`);
        return {
          code: project.code,
          name: project.name,
          deadline: project.deadline,
          targetAmount: project.target_amount,
          currentAmount,
          isExpired,
          isGoalReached,
          action: "no_action" as const,
          claimableBalancesCount: 0,
          tokenHoldersCount: 0,
          claimableBalances: [],
          tokenHolders: [],
          isClosed,
        };
      }

      if (!hasBalancesOrHolders && hasActiveOffer && (isGoalReached || isExpired)) {
        yield* Effect.logInfo(`  🔄 No balances to process, but found active offer that needs cancellation.`);

        const transactionResult = yield* pipe(
          createOfferCancellationTransaction(
            config,
            project.code,
            activeOffers,
          ),
          Effect.catchAll((error) =>
            pipe(
              Effect.logError(`❌ Error creating offer cancellation transaction for ${project.code}:`, error),
              Effect.flatMap(() => Effect.succeed(null)),
            )
          ),
        );

        if (transactionResult !== null) {
          yield* Effect.logInfo(`  ✅ Offer cancellation transaction created.`);

          return {
            code: project.code,
            name: project.name,
            deadline: project.deadline,
            targetAmount: project.target_amount,
            currentAmount,
            isExpired,
            isGoalReached,
            transactionXDR: transactionResult,
            action: "refund" as const,
            claimableBalancesCount: 0,
            tokenHoldersCount: 0,
            claimableBalances: [],
            tokenHolders: [],
            isClosed,
          };
        } else {
          return {
            code: project.code,
            name: project.name,
            deadline: project.deadline,
            targetAmount: project.target_amount,
            currentAmount,
            isExpired,
            isGoalReached,
            action: "no_action" as const,
            claimableBalancesCount: 0,
            tokenHoldersCount: 0,
            claimableBalances: [],
            tokenHolders: [],
            isClosed,
            error: "Failed to create offer cancellation transaction",
          };
        }
      }

      const transactionResult = yield* pipe(
        Effect.gen(function*() {
          let transactionXDR: string;
          let action: "refund" | "fund_project";

          // Get ALL accounts with trustlines to revoke authorization after clawback
          const allTrustlineAccounts = yield* pipe(
            getAllAccountsWithTrustlines(config, project.code),
            Effect.catchAll(() => Effect.succeed([] as readonly string[])),
          );

          if (isGoalReached) {
            // Goal reached - fund the project (regardless of deadline)
            const hasTrustline = yield* checkProjectTrustline(
              config,
              project.project_account_id,
            );

            if (currentAmountNum > targetAmountNum) {
              yield* Effect.logInfo(
                `  ⚠️ Collected amount (${currentAmount}) exceeds target (${project.target_amount}), but will process all funds`,
              );
            }

            transactionXDR = yield* createFundingTransaction(
              config,
              project.code,
              project.project_account_id,
              claimableBalances,
              tokenHolders,
              hasTrustline,
              allTrustlineAccounts,
            );
            action = "fund_project";
            yield* Effect.logInfo(`  ✅ Funding transaction created.`);
          } else {
            // Goal not reached and expired - refund supporters
            transactionXDR = yield* createRefundTransaction(
              config,
              project.code,
              claimableBalances,
              tokenHolders,
              activeOffers,
              allTrustlineAccounts,
            );
            action = "refund";
            yield* Effect.logInfo(`  🔄 Refund transaction created.`);
          }

          return { transactionXDR, action };
        }),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError(`❌ Error processing project ${project.code}:`, error),
            Effect.flatMap(() => Effect.succeed(null)),
          )
        ),
      );

      if (transactionResult !== null) {
        return {
          code: project.code,
          name: project.name,
          deadline: project.deadline,
          targetAmount: project.target_amount,
          currentAmount,
          isExpired,
          isGoalReached,
          transactionXDR: transactionResult.transactionXDR,
          action: transactionResult.action,
          claimableBalancesCount: claimableBalances.length,
          tokenHoldersCount: tokenHolders.length,
          claimableBalances,
          tokenHolders,
          isClosed,
        };
      } else {
        return {
          code: project.code,
          name: project.name,
          deadline: project.deadline,
          targetAmount: project.target_amount,
          currentAmount,
          isExpired,
          isGoalReached,
          action: "no_action" as const,
          claimableBalancesCount: claimableBalances.length,
          tokenHoldersCount: tokenHolders.length,
          claimableBalances,
          tokenHolders,
          isClosed,
          error: "Failed to create transaction",
        };
      }
    }),
  );

const getActiveOffers = (
  server: Horizon.Server,
  accountId: string,
): Effect.Effect<readonly Horizon.ServerApi.OfferRecord[], StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const allRecords: Horizon.ServerApi.OfferRecord[] = [];
        let callBuilder = server.offers()
          .forAccount(accountId)
          .limit(200); // Maximum allowed per request

        // Fetch all pages using pagination
        while (true) {
          const response = await callBuilder.call();
          allRecords.push(...response.records);

          // If we got fewer records than the limit, we've reached the end
          if (response.records.length < 200) {
            break;
          }

          // Prepare next page request
          const lastRecord = response.records[response.records.length - 1];
          if (lastRecord === undefined) break; // Safety check

          callBuilder = server.offers()
            .forAccount(accountId)
            .cursor(lastRecord.paging_token)
            .limit(200);
        }

        return allRecords;
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "get_active_offers",
        }),
    }),
  );

export const StellarCheckServiceLive = Layer.succeed(
  StellarCheckServiceTag,
  StellarCheckServiceTag.of({
    checkAllProjects: () =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config: StellarConfig) =>
          Effect.gen(function*() {
            // Validate issuer account flags before processing
            yield* Effect.logInfo("🔐 Validating issuer account flags...");
            const issuerAccount = yield* Effect.tryPromise({
              try: () => config.server.loadAccount(config.publicKey),
              catch: (error) =>
                new StellarError({
                  cause: error,
                  operation: "load_issuer_account",
                }),
            });

            const flags = issuerAccount.flags;
            if (!flags.auth_revocable) {
              yield* Effect.logError("❌ CRITICAL: AUTH_REVOCABLE_FLAG not set on issuer account!");
              yield* Effect.logError("   Clawback and authorization revocation will FAIL.");
              yield* Effect.fail(
                new StellarError({
                  cause: new Error("AUTH_REVOCABLE_FLAG not set"),
                  operation: "validate_account_flags",
                }),
              );
            }
            if (!flags.auth_clawback_enabled) {
              yield* Effect.logError("❌ CRITICAL: AUTH_CLAWBACK_ENABLED_FLAG not set on issuer account!");
              yield* Effect.logError("   Clawback operations will FAIL.");
              yield* Effect.fail(
                new StellarError({
                  cause: new Error("AUTH_CLAWBACK_ENABLED_FLAG not set"),
                  operation: "validate_account_flags",
                }),
              );
            }
            yield* Effect.logInfo("✅ Account flags validated: auth_revocable and auth_clawback_enabled are set");

            // First, get and display active offers
            yield* Effect.logInfo("📋 Checking active offers on account...");
            const activeOffers = yield* getActiveOffers(config.server, config.publicKey);

            if (activeOffers.length > 0) {
              yield* Effect.logInfo(`Found ${activeOffers.length} active offers:`);
              for (const offer of activeOffers) {
                const sellingAsset = offer.selling.asset_type === "native"
                  ? "XLM"
                  : `${offer.selling.asset_code}:${offer.selling.asset_issuer?.substring(0, 8)}...`;
                const buyingAsset = offer.buying.asset_type === "native"
                  ? "XLM"
                  : `${offer.buying.asset_code}:${offer.buying.asset_issuer?.substring(0, 8)}...`;

                yield* Effect.logInfo(
                  `  Offer #${offer.id}: ${offer.amount} ${sellingAsset} -> ${buyingAsset} @ ${offer.price}`,
                );
              }
            } else {
              yield* Effect.logInfo("No active offers found.");
            }

            // Then get account data
            const account = yield* Effect.tryPromise({
              try: async () => {
                const account = await config.server.loadAccount(config.publicKey);
                return account.data_attr;
              },
              catch: (error) =>
                new StellarError({
                  cause: error,
                  operation: "load_account",
                }),
            });

            return { account, activeOffers };
          })
        ),
        Effect.flatMap(({ account, activeOffers }) => {
          const projectEntries = Object.entries(account)
            .filter(([key]) => key.startsWith("ipfshash-"))
            .map(([key, value]) => {
              const code = key.replace("ipfshash-", "");
              const cid = Buffer.from(value, "base64").toString();
              return { code, cid, activeOffers };
            });

          return Effect.all(
            projectEntries.map((entry) =>
              pipe(
                fetchProjectDataFromIPFS(entry.cid),
                Effect.flatMap((projectData: ProjectData) =>
                  pipe(
                    getStellarConfig(),
                    Effect.flatMap((config: StellarConfig) =>
                      checkSingleProject(config, projectData, entry.activeOffers)
                    ),
                  )
                ),
                Effect.catchAll((error) =>
                  Effect.succeed({
                    code: entry.code,
                    name: "Unknown Project",
                    deadline: "1970-01-01",
                    targetAmount: "0",
                    currentAmount: "0",
                    isExpired: true,
                    isGoalReached: false,
                    action: "no_action" as const,
                    claimableBalancesCount: 0,
                    tokenHoldersCount: 0,
                    claimableBalances: [],
                    tokenHolders: [],
                    error: `Failed to fetch project data: ${error}`,
                  })
                ),
              )
            ),
            { concurrency: 5 }, // Limit concurrency to avoid rate limits
          );
        }),
      ),
  }),
);
