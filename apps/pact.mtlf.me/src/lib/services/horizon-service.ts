import { getStellarConfig, type EnvironmentError } from "@dreadnought/stellar-core";
import { Asset } from "@stellar/stellar-sdk";
import { Context, Effect, Layer, pipe } from "effect";
import { HorizonError } from "../errors";

// Service interface
export interface HorizonService {
  readonly getAccountDataEntries: (
    accountId: string,
  ) => Effect.Effect<Map<string, string>, HorizonError | EnvironmentError>;
  readonly getAssetHolders: (
    assetCode: string,
    issuerAccountId: string,
  ) => Effect.Effect<string[], HorizonError | EnvironmentError>;
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

  getAssetHolders: (assetCode: string, issuerAccountId: string) =>
    pipe(
      getStellarConfig(),
      Effect.flatMap((config) =>
        Effect.tryPromise({
          try: async () => {
            const asset = new Asset(assetCode, issuerAccountId);
            const holders: string[] = [];
            const accountsCall = config.server
              .accounts()
              .forAsset(asset)
              .limit(200);

            let page = await accountsCall.call();

            // Collect all accounts from paginated results
            while (page.records.length > 0) {
              for (const account of page.records) {
                holders.push(account.account_id);
              }

              // Check if there are more pages
              if (page.records.length < 200) break;

              // Get next page
              page = await page.next();
            }

            return holders;
          },
          catch: (error) =>
            new HorizonError({
              message: "Failed to load asset holders from Horizon",
              accountId: issuerAccountId,
              cause: error,
            }),
        })
      ),
      Effect.tap((holders) =>
        Effect.log(`Loaded ${holders.length} holders for asset ${assetCode}:${issuerAccountId}`)
      ),
    ),
});
