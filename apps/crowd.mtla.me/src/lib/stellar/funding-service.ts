import { Asset, BASE_FEE, Claimant, Operation, TimeoutInfinite, TransactionBuilder } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig, type StellarConfig, TRANSACTION_COMMISSION_FEE } from "./config";
import { StellarError, type StellarServiceError } from "./errors";

export interface FundingService {
  readonly createFundingTransaction: (
    userAccountId: string,
    projectCode: string,
    amount: string,
  ) => Effect.Effect<string, StellarServiceError>;
  readonly createFundingTransactionWithEURMTL: (
    userAccountId: string,
    projectCode: string,
    mtlCrowdAmount: string,
    eurMtlAmount: string,
  ) => Effect.Effect<string, StellarServiceError>;
}

export const FundingServiceTag = Context.GenericTag<FundingService>(
  "@crowd.mtla.me/FundingService",
);

// EURMTL asset definition
const EURMTL_ASSET = new Asset("EURMTL", "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");

const createFundingTransactionImpl = (
  config: StellarConfig,
  userAccountId: string,
  projectCode: string,
  amount: string,
): Effect.Effect<string, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        // Load user account
        const userAccount = await config.server.loadAccount(userAccountId);

        // Create asset definitions
        const mtlCrowdAsset = config.mtlCrowdAsset;
        const crowdfundingAsset = new Asset(`C${projectCode}`, config.publicKey);

        // Build transaction
        const transaction = new TransactionBuilder(userAccount, {
          fee: BASE_FEE,
          networkPassphrase: config.networkPassphrase,
        })
          // Open trust line to C-token if it doesn't exist
          .addOperation(Operation.changeTrust({
            asset: crowdfundingAsset,
            limit: "922337203685.4775807", // Maximum possible limit
          }))
          // Buy C-tokens with MTLCrowd tokens (1:1 exchange)
          .addOperation(Operation.manageBuyOffer({
            selling: mtlCrowdAsset,
            buying: crowdfundingAsset,
            buyAmount: amount,
            price: "1.0000000", // 1:1 exchange rate
            offerId: "0", // New offer
          }))
          // Send commission to the commission account
          .addOperation(Operation.payment({
            destination: config.commissionAccountId,
            asset: Asset.native(),
            amount: TRANSACTION_COMMISSION_FEE,
          }))
          // Create claimable balance with the C-tokens
          // This allows user to reclaim their funds if needed
          .addOperation(Operation.createClaimableBalance({
            asset: crowdfundingAsset,
            amount,
            claimants: [
              new Claimant(config.publicKey), // Platform can claim
              new Claimant(userAccountId), // User can reclaim
            ],
          }))
          .setTimeout(TimeoutInfinite)
          .build();

        return transaction.toXDR();
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "create_funding_transaction",
        }),
    }),
  );

const createFundingTransactionWithEURMTLImpl = (
  config: StellarConfig,
  userAccountId: string,
  projectCode: string,
  mtlCrowdAmount: string,
  eurMtlAmount: string,
): Effect.Effect<string, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        // Load user account
        const userAccount = await config.server.loadAccount(userAccountId);

        // Create asset definitions
        const mtlCrowdAsset = config.mtlCrowdAsset;
        const crowdfundingAsset = new Asset(`C${projectCode}`, config.publicKey);
        const totalAmount = (parseFloat(mtlCrowdAmount) + parseFloat(eurMtlAmount)).toString();

        // Build transaction
        const transactionBuilder = new TransactionBuilder(userAccount, {
          fee: BASE_FEE,
          networkPassphrase: config.networkPassphrase,
        });

        // Open trust line to MTLCrowd if it doesn't exist (needed for EURMTL exchange)
        transactionBuilder.addOperation(Operation.changeTrust({
          asset: mtlCrowdAsset,
          limit: "922337203685.4775807", // Maximum possible limit
        }));

        // Open trust line to C-token if it doesn't exist
        transactionBuilder.addOperation(Operation.changeTrust({
          asset: crowdfundingAsset,
          limit: "922337203685.4775807", // Maximum possible limit
        }));

        // If EURMTL amount > 0, create exchange order EURMTL -> MTLCrowd (1:1)
        if (parseFloat(eurMtlAmount) > 0) {
          transactionBuilder.addOperation(Operation.manageBuyOffer({
            selling: EURMTL_ASSET,
            buying: mtlCrowdAsset,
            buyAmount: eurMtlAmount,
            price: "1.0000000", // 1:1 exchange rate
            offerId: "0", // New offer
          }));
        }

        // Buy C-tokens with MTLCrowd tokens (1:1 exchange) - use total amount
        transactionBuilder.addOperation(Operation.manageBuyOffer({
          selling: mtlCrowdAsset,
          buying: crowdfundingAsset,
          buyAmount: totalAmount,
          price: "1.0000000", // 1:1 exchange rate
          offerId: "0", // New offer
        }));

        // Send commission to the commission account
        transactionBuilder.addOperation(Operation.payment({
          destination: config.commissionAccountId,
          asset: Asset.native(),
          amount: TRANSACTION_COMMISSION_FEE,
        }));

        // Create claimable balance with the C-tokens
        // This allows user to reclaim their funds if needed
        transactionBuilder.addOperation(Operation.createClaimableBalance({
          asset: crowdfundingAsset,
          amount: totalAmount,
          claimants: [
            new Claimant(config.publicKey), // Platform can claim
            new Claimant(userAccountId), // User can reclaim
          ],
        }));

        const transaction = transactionBuilder
          .setTimeout(TimeoutInfinite)
          .build();

        return transaction.toXDR();
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "create_funding_transaction_with_eurmtl",
        }),
    }),
  );

export const FundingServiceLive = Layer.succeed(
  FundingServiceTag,
  FundingServiceTag.of({
    createFundingTransaction: (
      userAccountId: string,
      projectCode: string,
      amount: string,
    ) =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config) => createFundingTransactionImpl(config, userAccountId, projectCode, amount)),
      ),
    createFundingTransactionWithEURMTL: (
      userAccountId: string,
      projectCode: string,
      mtlCrowdAmount: string,
      eurMtlAmount: string,
    ) =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config) =>
          createFundingTransactionWithEURMTLImpl(config, userAccountId, projectCode, mtlCrowdAmount, eurMtlAmount)
        ),
      ),
  }),
);
