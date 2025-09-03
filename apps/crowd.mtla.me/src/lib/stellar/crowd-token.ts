import { Asset } from "@stellar/stellar-sdk";
import { Effect, pipe } from "effect";
import { EnvironmentError } from "./errors";

export interface CrowdTokenConfig {
  readonly code: string;
  readonly issuer: string;
  readonly asset: Asset;
}

/**
 * Parses STELLAR_CROWD_TOKEN environment variable in format "code-account_id"
 * and creates an Asset instance for MTLCrowd token
 */
export const parseCrowdToken = (
  crowdToken?: string,
  fallbackIssuer?: string,
): Effect.Effect<CrowdTokenConfig, EnvironmentError> =>
  pipe(
    Effect.sync(() => {
      if (crowdToken === undefined || crowdToken === null || crowdToken.trim() === "") {
        if (fallbackIssuer === undefined || fallbackIssuer === null) {
          throw new Error("No crowd token or fallback issuer provided");
        }
        // Default to MTLCrowd with fallback issuer
        return {
          code: "MTLCrowd",
          issuer: fallbackIssuer,
        };
      }

      const parts = crowdToken.split("-");
      if (parts.length !== 2) {
        throw new Error(
          `Invalid STELLAR_CROWD_TOKEN format: "${crowdToken}". Expected format: "code-account_id"`,
        );
      }

      const [code, issuer] = parts;
      if (
        code === undefined
        || code === null
        || code === ""
        || issuer === undefined
        || issuer === null
        || issuer === ""
      ) {
        throw new Error(
          `Invalid STELLAR_CROWD_TOKEN format: "${crowdToken}". Both code and account_id must be non-empty`,
        );
      }

      return { code: code.trim(), issuer: issuer.trim() };
    }),
    Effect.flatMap(({ code, issuer }) =>
      Effect.try({
        try: () => ({
          code,
          issuer,
          asset: new Asset(code, issuer),
        }),
        catch: () =>
          new EnvironmentError({
            variable: "STELLAR_CROWD_TOKEN",
          }),
      })
    ),
    Effect.catchAll(() =>
      Effect.fail(
        new EnvironmentError({
          variable: "STELLAR_CROWD_TOKEN",
        }),
      )
    ),
  );
