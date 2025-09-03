import { Asset, BASE_FEE, Claimant, Operation, TimeoutInfinite, TransactionBuilder } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { getStellarConfig, type StellarConfig } from "./config";
import { StellarError, type StellarServiceError } from "./errors";

export interface ProjectService {
  readonly createProjectTransaction: (
    code: string,
    cid: string,
    projectAccountId: string,
    targetAmount: string,
  ) => Effect.Effect<string, StellarServiceError>;
}

export const ProjectServiceTag = Context.GenericTag<ProjectService>(
  "@crowd.mtla.me/ProjectService",
);

const createProjectTransactionImpl = (
  config: StellarConfig,
  code: string,
  cid: string,
  projectAccountId: string,
  targetAmount: string,
): Effect.Effect<string, StellarError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const sourceAccount = await config.server.loadAccount(config.publicKey);

        // Create P-token (project token) and C-token (crowdfunding token) codes
        const projectTokenCode = `P${code}`;
        const crowdfundingTokenCode = `C${code}`;

        // MTLCrowd token from config
        const mtlCrowdAsset = config.mtlCrowdAsset;
        const projectAsset = new Asset(projectTokenCode, config.publicKey);
        const crowdfundingAsset = new Asset(crowdfundingTokenCode, config.publicKey);

        const transaction = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase: config.networkPassphrase,
        })
          // Store IPFS hash with project code
          .addOperation(Operation.manageData({
            name: `ipfshash-P${code}`,
            value: cid,
          }))
          // Create claimable balance for P-token (project token)
          .addOperation(Operation.createClaimableBalance({
            asset: projectAsset,
            amount: "0.0000001",
            claimants: [
              new Claimant(config.publicKey),
              new Claimant(projectAccountId),
            ],
          }))
          // Create sell order: C-token for MTLCrowd at 1:1 rate
          .addOperation(Operation.manageSellOffer({
            selling: crowdfundingAsset,
            buying: mtlCrowdAsset,
            amount: targetAmount,
            price: "1.0000000", // 1:1 exchange rate
            offerId: "0", // New offer
          }))
          .setTimeout(TimeoutInfinite)
          .build();

        return transaction.toXDR();
      },
      catch: (error) =>
        new StellarError({
          cause: error,
          operation: "create_project_transaction",
        }),
    }),
  );

export const ProjectServiceLive = Layer.succeed(
  ProjectServiceTag,
  ProjectServiceTag.of({
    createProjectTransaction: (
      code: string,
      cid: string,
      projectAccountId: string,
      targetAmount: string,
    ) =>
      pipe(
        getStellarConfig(),
        Effect.flatMap((config) => createProjectTransactionImpl(config, code, cid, projectAccountId, targetAmount)),
      ),
  }),
);
