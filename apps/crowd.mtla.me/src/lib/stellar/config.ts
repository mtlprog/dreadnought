import { Horizon, Networks } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import { EnvironmentError } from "./errors";

export interface StellarConfig {
  readonly publicKey: string;
  readonly network: string;
  readonly server: Horizon.Server;
  readonly networkPassphrase: string;
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
    ]),
    Effect.map(([publicKey, network]: readonly [string, string]) => ({
      publicKey,
      network,
      server: new Horizon.Server(
        network === "mainnet"
          ? "https://horizon.stellar.org"
          : "https://horizon-testnet.stellar.org",
      ),
      networkPassphrase: network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    })),
  );
