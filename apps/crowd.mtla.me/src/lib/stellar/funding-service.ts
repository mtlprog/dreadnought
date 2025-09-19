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

// Commission configuration
export const COMMISSION_AMOUNT = "0.0000000";

const addCommissionOperation = (config: StellarConfig) =>
  Operation.payment({
    destination: config.commissionAccountId,
    asset: Asset.native(),
    amount: COMMISSION_AMOUNT,
  });

const addTrustLineOperation = (asset: Asset, limit = "922337203685.4775807") => Operation.changeTrust({ asset, limit });

const addBuyOfferOperation = (selling: Asset, buying: Asset, buyAmount: string, price = "1.0000000") =>
  Operation.manageBuyOffer({
    selling,
    buying,
    buyAmount,
    price,
    offerId: "0",
  });

const addClaimableBalanceOperation = (asset: Asset, amount: string, platformKey: string, userKey: string) =>
  Operation.createClaimableBalance({
    asset,
    amount,
    claimants: [
      new Claimant(platformKey),
      new Claimant(userKey),
    ],
  });

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
          .addOperation(addTrustLineOperation(crowdfundingAsset))
          .addOperation(addBuyOfferOperation(mtlCrowdAsset, crowdfundingAsset, amount))
          .addOperation(addCommissionOperation(config))
          .addOperation(addClaimableBalanceOperation(crowdfundingAsset, amount, config.publicKey, userAccountId))
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
        })
          .addOperation(addTrustLineOperation(mtlCrowdAsset))
          .addOperation(addTrustLineOperation(crowdfundingAsset));

        // If EURMTL amount > 0, create exchange order EURMTL -> MTLCrowd (1:1)
        if (parseFloat(eurMtlAmount) > 0) {
          transactionBuilder.addOperation(addBuyOfferOperation(EURMTL_ASSET, mtlCrowdAsset, eurMtlAmount));
        }

        const transaction = transactionBuilder
          .addOperation(addBuyOfferOperation(mtlCrowdAsset, crowdfundingAsset, totalAmount))
          .addOperation(addCommissionOperation(config))
          .addOperation(addClaimableBalanceOperation(crowdfundingAsset, totalAmount, config.publicKey, userAccountId))
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
