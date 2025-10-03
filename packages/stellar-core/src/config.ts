import { Horizon, Networks } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import type { EnvironmentError } from "./errors";

/**
 * Base Stellar network configuration
 * Contains network type, Horizon server instance, and network passphrase
 */
export interface StellarConfig {
  readonly network: string;
  readonly server: Horizon.Server;
  readonly networkPassphrase: string;
}

/**
 * Get Stellar network configuration from environment
 * Reads STELLAR_NETWORK env var (defaults to "testnet")
 * Returns Effect with StellarConfig or EnvironmentError
 *
 * @example
 * ```typescript
 * const config = await Effect.runPromise(getStellarConfig());
 * const account = await config.server.loadAccount(accountId);
 * ```
 */
export const getStellarConfig = (): Effect.Effect<StellarConfig, EnvironmentError, never> =>
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
