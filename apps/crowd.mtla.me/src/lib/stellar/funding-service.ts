import { Asset, BASE_FEE, Claimant, Operation, TimeoutInfinite, TransactionBuilder } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig, type StellarConfig } from "./config";
import { StellarError, type StellarServiceError } from "./errors";

export interface FundingService {
  readonly createFundingTransaction: (
    userAccountId: string,
    projectCode: string,
    amount: string,
  ) => Effect.Effect<string, StellarServiceError>;
}

export const FundingServiceTag = Context.GenericTag<FundingService>(
  "@crowd.mtla.me/FundingService",
);

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
        const mtlCrowdAsset = new Asset("MTLCrowd", config.publicKey);
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
  }),
);
