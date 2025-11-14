import { getStellarConfig, type EnvironmentError } from "@dreadnought/stellar-core";
import { Context, Effect, Layer, pipe } from "effect";
import { HorizonError } from "../errors";

// Service interface
export interface HorizonService {
  readonly getAccountDataEntries: (
    accountId: string,
  ) => Effect.Effect<Map<string, string>, HorizonError | EnvironmentError>;
}

export const HorizonServiceTag = Context.GenericTag<HorizonService>(
  "@services/HorizonService",
);

// Service implementation
export const HorizonServiceLive = Layer.succeed(HorizonServiceTag, {
  getAccountDataEntries: (accountId: string) =>
    pipe(
      getStellarConfig(),
      Effect.flatMap((config) =>
        Effect.tryPromise({
          try: () => config.server.accounts().accountId(accountId).call(),
          catch: (error) =>
            new HorizonError({
              message: "Failed to load account from Horizon",
              accountId,
              cause: error,
            }),
        })
      ),
      Effect.map((account) => {
        const dataMap = new Map<string, string>();

        if (account.data_attr) {
          for (const [key, value] of Object.entries(account.data_attr)) {
            // Decode base64 value
            try {
              const decoded = Buffer.from(value, "base64").toString("utf-8");
              dataMap.set(key, decoded);
            } catch {
              // If decoding fails, store raw base64
              dataMap.set(key, value);
            }
          }
        }

        return dataMap;
      }),
      Effect.tap((dataMap) =>
        Effect.log(`Loaded ${dataMap.size} data entries for account ${accountId}`)
      ),
    ),
});
