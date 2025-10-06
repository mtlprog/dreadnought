// Re-export from @dreadnought/stellar-utils
export type { AssetInfo } from "@dreadnought/stellar-utils";

// Price calculation details
export interface PriceDetails {
  readonly source: "path";
  readonly path: readonly {
    readonly from: string;
    readonly to: string;
  }[];
}

// Token price calculation types
export interface TokenPairPrice {
  readonly tokenA: string;
  readonly tokenB: string;
  readonly price: string;
  readonly timestamp: Date;
  readonly details?: PriceDetails;
}
