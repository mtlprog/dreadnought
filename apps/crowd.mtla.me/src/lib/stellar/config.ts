import {
  EnvironmentError,
  getStellarConfig as getBaseStellarConfig,
  type StellarConfig as BaseStellarConfig,
} from "@dreadnought/stellar-core";
import { type Asset } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import { parseCrowdToken } from "./crowd-token";

// Commission fee in XLM for transactions
export const TRANSACTION_COMMISSION_FEE = "0.5000000";

/**
 * Extended Stellar config for crowd.mtla.me app
 * Adds crowdfunding-specific fields to base config
 */
export interface StellarConfig extends BaseStellarConfig {
  readonly publicKey: string;
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
      getBaseStellarConfig(),
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
      [publicKey, baseConfig, crowdToken, commissionAccountId]: readonly [
        string,
        BaseStellarConfig,
        string | undefined,
        string,
      ],
    ) =>
      pipe(
        parseCrowdToken(crowdToken, publicKey),
        Effect.map((crowdTokenConfig) => ({
          ...baseConfig,
          publicKey,
          mtlCrowdAsset: crowdTokenConfig.asset,
          commissionAccountId,
        })),
      )
    ),
  );
