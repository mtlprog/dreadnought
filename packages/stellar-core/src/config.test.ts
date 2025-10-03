import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { getStellarConfig } from "./config";

describe("getStellarConfig", () => {
  test("should return testnet config by default", async () => {
    const program = getStellarConfig();
    const config = await Effect.runPromise(program);

    expect(config.network).toBe("testnet");
    expect(config.server).toBeDefined();
    expect(config.networkPassphrase).toBe("Test SDF Network ; September 2015");
  });

  test("should return mainnet config when STELLAR_NETWORK=mainnet", async () => {
    // Set env for test
    const originalEnv = process.env["STELLAR_NETWORK"];
    process.env["STELLAR_NETWORK"] = "mainnet";

    const program = getStellarConfig();
    const config = await Effect.runPromise(program);

    expect(config.network).toBe("mainnet");
    expect(config.networkPassphrase).toBe("Public Global Stellar Network ; September 2015");

    // Restore env
    if (originalEnv !== undefined) {
      process.env["STELLAR_NETWORK"] = originalEnv;
    } else {
      delete process.env["STELLAR_NETWORK"];
    }
  });
});
