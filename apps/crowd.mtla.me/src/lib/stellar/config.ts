import { type Asset, Horizon, Networks } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import { parseCrowdToken } from "./crowd-token";
import { EnvironmentError } from "./errors";

// Commission fee in XLM for transactions
export const TRANSACTION_COMMISSION_FEE = "0.5000000";

export interface StellarConfig {
  readonly publicKey: string;
  readonly network: string;
  readonly server: Horizon.Server;
  readonly networkPassphrase: string;
  readonly mtlCrowdAsset: Asset;
  readonly commissionAccountId: string;
}

export const getStellarConfig = (): Effect.Effect<StellarConfig, EnvironmentError> =>
  pipe(
    Effect.all([
      pipe(
        Effect.sync(() => process.env["STELLAR_ACCOUNT_ID"]),
        Effect.flatMap(value =>
          value !== undefined && value !== ""
            ? Effect.succeed(value)
            : Effect.fail(new EnvironmentError({ variable: "STELLAR_ACCOUNT_ID" }))
        ),
      ),
      pipe(
        Effect.sync(() => process.env["STELLAR_NETWORK"] ?? "testnet"),
      ),
      pipe(
        Effect.sync(() => process.env["STELLAR_CROWD_TOKEN"]),
      ),
      pipe(
        Effect.sync(() => process.env["STELLAR_COMM_ACCOUNT_ID"]),
        Effect.flatMap(value =>
          value !== undefined && value !== ""
            ? Effect.succeed(value)
            : Effect.fail(new EnvironmentError({ variable: "STELLAR_COMM_ACCOUNT_ID" }))
        ),
      ),
    ]),
    Effect.flatMap((
      [publicKey, network, crowdToken, commissionAccountId]: readonly [string, string, string | undefined, string],
    ) =>
      pipe(
        parseCrowdToken(crowdToken, publicKey),
        Effect.map((crowdTokenConfig) => ({
          publicKey,
          network,
          server: new Horizon.Server(
            network === "mainnet"
              ? "https://horizon.stellar.org"
              : "https://horizon-testnet.stellar.org",
          ),
          networkPassphrase: network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
          mtlCrowdAsset: crowdTokenConfig.asset,
          commissionAccountId,
        })),
      )
    ),
  );
