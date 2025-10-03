// Re-export from @dreadnought/stellar-utils
export type { AssetInfo } from "@dreadnought/stellar-utils";

// Price calculation details
export interface PriceDetails {
  readonly source: "orderbook" | "path";
  readonly bid?: string;
  readonly ask?: string;
  readonly midPrice?: string;
  readonly path?: readonly {
    readonly from: string;
    readonly to: string;
    readonly price?: string;
    readonly bid?: string;
    readonly ask?: string;
    readonly midPrice?: string;
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
