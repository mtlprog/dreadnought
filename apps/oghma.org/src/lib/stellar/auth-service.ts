import { Context, Effect, Layer, pipe } from "effect";
import * as S from "@effect/schema/Schema";
import {
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { getStellarConfig } from "@dreadnought/stellar-core";
import type { Horizon } from "@stellar/stellar-sdk";

// Errors
export class AuthError extends S.TaggedError<AuthError>()(
  "AuthError",
  {
    message: S.String,
    cause: S.Unknown.annotations({ identifier: "UnknownCause" }),
  }
) {}

export class ChallengeGenerationError extends S.TaggedError<ChallengeGenerationError>()(
  "ChallengeGenerationError",
  {
    message: S.String,
  }
) {}

export class ChallengeVerificationError extends S.TaggedError<ChallengeVerificationError>()(
  "ChallengeVerificationError",
  {
    message: S.String,
  }
) {}

// Types
export interface ChallengeResponse {
  transaction: string; // XDR
  networkPassphrase: string;
}

export interface VerifyResponse {
  publicKey: string;
  isValid: boolean;
}

// Service interface
export interface AuthService {
  readonly generateChallenge: (
    clientPublicKey: string
  ) => Effect.Effect<ChallengeResponse, ChallengeGenerationError>;

  readonly verifyChallenge: (
    signedTransactionXDR: string,
    clientPublicKey: string
  ) => Effect.Effect<VerifyResponse, ChallengeVerificationError | AuthError>;
}

// Service tag
export const AuthServiceTag =
  Context.GenericTag<AuthService>("@app/AuthService");

// Constants
const CHALLENGE_TIMEOUT = 300; // 5 minutes in seconds
const HOME_DOMAIN = "oghma.org";

// Implementation
export const AuthServiceLive = Layer.effect(
  AuthServiceTag,
  Effect.gen(function* () {
    // Get Stellar configuration
    const config = yield* getStellarConfig();

    // Get server keypair from environment
    const serverSecret = process.env.STELLAR_SERVER_SECRET;
    if (!serverSecret) {
      yield* Effect.fail(
        new AuthError({
          message: "STELLAR_SERVER_SECRET not found in environment",
          cause: undefined,
        })
      );
    }

    const serverKeypair = Keypair.fromSecret(serverSecret!);

    return {
      generateChallenge: (clientPublicKey: string) =>
        pipe(
          Effect.try({
            try: () => {
              // Validate client public key
              Keypair.fromPublicKey(clientPublicKey);

              // Load server account to get sequence number
              return config.server.loadAccount(serverKeypair.publicKey());
            },
            catch: (error) =>
              new ChallengeGenerationError({
                message: `Failed to load server account: ${error}`,
              }),
          }),
          Effect.flatMap((serverAccount: Horizon.AccountResponse) =>
            Effect.try({
              try: () => {
                // Generate random challenge nonce
                const nonce = Buffer.from(
                  Array.from({ length: 48 }, () =>
                    Math.floor(Math.random() * 256)
                  )
                ).toString("base64");

                // Create challenge transaction
                const now = Math.floor(Date.now() / 1000);
                const transaction = new TransactionBuilder(serverAccount, {
                  fee: BASE_FEE,
                  networkPassphrase: config.networkPassphrase,
                })
                  .addOperation(
                    Operation.manageData({
                      name: `${HOME_DOMAIN} auth`,
                      value: nonce,
                      source: clientPublicKey,
                    })
                  )
                  .setTimeout(CHALLENGE_TIMEOUT)
                  .build();

                // Server signs the transaction
                transaction.sign(serverKeypair);

                return {
                  transaction: transaction.toXDR(),
                  networkPassphrase: config.networkPassphrase,
                };
              },
              catch: (error) =>
                new ChallengeGenerationError({
                  message: `Failed to generate challenge: ${error}`,
                }),
            })
          ),
          Effect.tap(() =>
            Effect.log(
              `Generated challenge for client: ${clientPublicKey.substring(0, 8)}...`
            )
          )
        ),

      verifyChallenge: (signedTransactionXDR: string, clientPublicKey: string) =>
        pipe(
          Effect.try({
            try: () => {
              // Parse the transaction
              const transaction = new Transaction(
                signedTransactionXDR,
                config.networkPassphrase
              );

              // Verify transaction structure
              if (transaction.operations.length !== 1) {
                throw new Error("Invalid transaction: must have exactly one operation");
              }

              const operation = transaction.operations[0];
              if (operation.type !== "manageData") {
                throw new Error("Invalid transaction: operation must be manageData");
              }

              // Verify operation source matches client
              if (operation.source !== clientPublicKey) {
                throw new Error("Invalid transaction: operation source doesn't match client");
              }

              // Verify transaction is not expired
              const now = Math.floor(Date.now() / 1000);
              if (
                transaction.timeBounds &&
                Number(transaction.timeBounds.maxTime) < now
              ) {
                throw new Error("Transaction expired");
              }

              // Verify signatures
              // Transaction should have 2 signatures: server + client
              if (transaction.signatures.length !== 2) {
                throw new Error("Invalid transaction: must have exactly 2 signatures");
              }

              // Verify server signature
              const serverSignature = transaction.signatures.find((sig) =>
                serverKeypair.verify(transaction.hash(), sig.signature())
              );
              if (!serverSignature) {
                throw new Error("Server signature not found");
              }

              // Verify client signature
              const clientKeypair = Keypair.fromPublicKey(clientPublicKey);
              const clientSignature = transaction.signatures.find((sig) =>
                clientKeypair.verify(transaction.hash(), sig.signature())
              );
              if (!clientSignature) {
                throw new Error("Client signature not found");
              }

              return {
                publicKey: clientPublicKey,
                isValid: true,
              };
            },
            catch: (error) =>
              new ChallengeVerificationError({
                message: `Verification failed: ${error}`,
              }),
          }),
          Effect.tap(({ publicKey }) =>
            Effect.log(`Verified challenge for client: ${publicKey.substring(0, 8)}...`)
          ),
          Effect.catchTag("ChallengeVerificationError", (error) =>
            Effect.succeed({
              publicKey: clientPublicKey,
              isValid: false,
            })
          )
        ),
    };
  })
);
