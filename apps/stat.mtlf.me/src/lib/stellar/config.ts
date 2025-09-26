import { Horizon, Networks } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import type { EnvironmentError } from "./errors";

export interface StellarConfig {
  readonly network: string;
  readonly server: Horizon.Server;
  readonly networkPassphrase: string;
}

export const getStellarConfig = (): Effect.Effect<StellarConfig, EnvironmentError> =>
  pipe(
    Effect.sync(() => process.env["STELLAR_NETWORK"] ?? "testnet"),
    Effect.map((network) => ({
      network,
      server: new Horizon.Server(
        network === "mainnet"
          ? "https://horizon.stellar.org"
          : "https://horizon-testnet.stellar.org",
      ),
      networkPassphrase: network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    })),
  );
