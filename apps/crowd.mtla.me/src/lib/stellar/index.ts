// Re-export all Stellar-related functionality
export * from "./balance-service";
export * from "./check-service";
export * from "./config";
export * from "./errors";
export * from "./funding-service";
export * from "./project-service";
export * from "./service";
export * from "./types";
export * from "./utils";

// Export combined service layer
import { Layer } from "effect";
import { BalanceServiceLive } from "./balance-service";
import { FundingServiceLive } from "./funding-service";
import { StellarServiceLive } from "./service";

export const StellarLayer = Layer.mergeAll(
  BalanceServiceLive,
  FundingServiceLive,
  StellarServiceLive,
);
