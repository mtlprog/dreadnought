// Re-export from @dreadnought/stellar-utils
export type { AssetInfo } from "@dreadnought/stellar-utils";

// Price data from a single source
export interface PriceSource {
  readonly ask: string | null;
  readonly bid: string | null;
}

// Orderbook data for a single hop (includes both orderbook and AMM)
export interface OrderbookData {
  readonly orderbook: PriceSource; // Traditional orderbook prices
  readonly amm: PriceSource & { readonly poolId?: string }; // AMM pool prices with pool ID
  readonly bestSource: "orderbook" | "amm" | "none"; // Which source has better price
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
