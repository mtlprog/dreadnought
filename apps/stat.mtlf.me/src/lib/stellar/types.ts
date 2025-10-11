// Re-export from @dreadnought/stellar-utils
export type { AssetInfo } from "@dreadnought/stellar-utils";

// Orderbook data for a single hop
export interface OrderbookData {
  readonly ask: string | null; // Best ask price (lowest sell offer)
  readonly bid: string | null; // Best bid price (highest buy offer)
}

// Price calculation details
export interface PriceDetails {
  readonly source: "path";
  readonly path: readonly {
    readonly from: string;
    readonly to: string;
    readonly orderbook?: OrderbookData; // Optional orderbook data for this hop
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
