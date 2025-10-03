import { describe, expect, test } from "bun:test";
import { EnvironmentError, StellarError, TokenPriceError } from "./errors";

describe("Stellar Errors", () => {
  test("StellarError should be created with operation and cause", () => {
    const error = new StellarError({
      operation: "loadAccount",
      cause: new Error("Account not found"),
    });

    expect(error._tag).toBe("StellarError");
    expect(error.operation).toBe("loadAccount");
    expect(error.cause).toBeInstanceOf(Error);
  });

  test("EnvironmentError should be created with variable name", () => {
    const error = new EnvironmentError({
      variable: "STELLAR_NETWORK",
    });

    expect(error._tag).toBe("EnvironmentError");
    expect(error.variable).toBe("STELLAR_NETWORK");
  });

  test("TokenPriceError should be created with message and optional tokens", () => {
    const error = new TokenPriceError({
      message: "No orderbook data",
      tokenA: "XLM",
      tokenB: "USDC",
    });

    expect(error._tag).toBe("TokenPriceError");
    expect(error.message).toBe("No orderbook data");
    expect(error.tokenA).toBe("XLM");
    expect(error.tokenB).toBe("USDC");
  });
});
