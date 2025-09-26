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

// Stellar asset representation
export interface AssetInfo {
  readonly code: string;
  readonly issuer: string;
  readonly type: "native" | "credit_alphanum4" | "credit_alphanum12";
}