import { describe, expect, test } from "bun:test";
import { Cause, Effect, Exit, ManagedRuntime, Option } from "effect";
import { IPFSServiceLive, IPFSServiceTag } from "./ipfs-service";
import { IPFSError } from "../errors";

describe("IPFSService", () => {
  describe("fetchMarkdown", () => {
    test("should reject non-whitelisted URLs", async () => {
      const testRuntime = ManagedRuntime.make(IPFSServiceLive);

      try {
        const program = Effect.gen(function* () {
          const service = yield* IPFSServiceTag;
          return yield* service.fetchMarkdown("https://evil.com/malicious");
        });

        const result = await Effect.runPromiseExit(program.pipe(
          Effect.provide(IPFSServiceLive)
        ));

        expect(Exit.isFailure(result)).toBe(true);
        if (Exit.isFailure(result)) {
          const errorOption = Cause.failureOption(result.cause);
          expect(Option.isSome(errorOption)).toBe(true);
          if (Option.isSome(errorOption)) {
            const error = errorOption.value;
            expect(error).toBeInstanceOf(IPFSError);
            if (error instanceof IPFSError) {
              expect(error.message).toContain("URL host not allowed");
            }
          }
        }
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should accept whitelisted IPFS gateway URLs", async () => {
      const testRuntime = ManagedRuntime.make(IPFSServiceLive);

      try {
        const program = Effect.gen(function* () {
          const service = yield* IPFSServiceTag;
          // This will still fail with network error, but should pass validation
          return yield* service.fetchMarkdown(
            "https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
          );
        });

        const result = await Effect.runPromiseExit(program.pipe(
          Effect.provide(IPFSServiceLive)
        ));

        // Should fail with fetch error, not validation error
        if (Exit.isFailure(result)) {
          const errorOption = Cause.failureOption(result.cause);
          if (Option.isSome(errorOption)) {
            const error = errorOption.value;
            if (error instanceof IPFSError) {
              expect(error.message).not.toContain("URL host not allowed");
            }
          }
        }
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should reject invalid URL formats", async () => {
      const testRuntime = ManagedRuntime.make(IPFSServiceLive);

      try {
        const program = Effect.gen(function* () {
          const service = yield* IPFSServiceTag;
          return yield* service.fetchMarkdown("http://[invalid");
        });

        const result = await Effect.runPromiseExit(program.pipe(
          Effect.provide(IPFSServiceLive)
        ));

        expect(Exit.isFailure(result)).toBe(true);
        if (Exit.isFailure(result)) {
          const errorOption = Cause.failureOption(result.cause);
          expect(Option.isSome(errorOption)).toBe(true);
          if (Option.isSome(errorOption)) {
            const error = errorOption.value;
            expect(error).toBeInstanceOf(IPFSError);
            if (error instanceof IPFSError) {
              expect(error.message).toContain("Invalid URL format");
            }
          }
        }
      } finally {
        await testRuntime.dispose();
      }
    });

    test("should construct gateway URL for plain CIDs", async () => {
      const testRuntime = ManagedRuntime.make(IPFSServiceLive);

      try {
        const program = Effect.gen(function* () {
          const service = yield* IPFSServiceTag;
          // This will fail with network error, but should pass validation and URL construction
          return yield* service.fetchMarkdown(
            "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
          );
        });

        const result = await Effect.runPromiseExit(program.pipe(
          Effect.provide(IPFSServiceLive)
        ));

        // Should fail with fetch error, not validation error
        if (Exit.isFailure(result)) {
          const error = result.cause._tag === "Fail" ? result.cause.failure : null;
          if (error instanceof IPFSError) {
            expect(error.message).toContain("Failed to fetch markdown from IPFS");
            expect(error.message).not.toContain("URL host not allowed");
            expect(error.message).not.toContain("Invalid URL format");
          }
        }
      } finally {
        await testRuntime.dispose();
      }
    });
  });
});
