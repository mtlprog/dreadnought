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
  readonly sourceAmount?: string; // Amount of source asset being sold
  readonly destinationAmount?: string; // Amount of destination asset received
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
  readonly price: string; // Price per 1 token (destination_amount / source_amount)
  readonly destinationAmount: string; // Actual destination amount received
  readonly timestamp: Date;
  readonly details?: PriceDetails;
}
