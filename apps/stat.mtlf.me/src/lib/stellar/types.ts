import * as S from "@effect/schema/Schema";

// Token price calculation types
export interface TokenPairPrice {
  readonly tokenA: string;
  readonly tokenB: string;
  readonly price: string;
  readonly timestamp: Date;
}

// Stellar asset representation
export interface AssetInfo {
  readonly code: string;
  readonly issuer: string;
  readonly type: "native" | "credit_alphanum4" | "credit_alphanum12";
}