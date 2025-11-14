import * as S from "@effect/schema/Schema";

// Contract metadata from IPFS (SEP-0039)
export const ContractMetadata = S.Struct({
  name: S.String,
  description: S.String,
  url: S.optional(S.String),
});

export type ContractMetadata = S.Schema.Type<typeof ContractMetadata>;

// Contract with loaded markdown content
export interface Contract {
  assetCode: string;
  metadata: ContractMetadata;
  markdown: string | null;
}

// Preset accounts
export const PRESET_ACCOUNTS = [
  {
    id: "GAYYQCPTA52PUTTDDNFDX5FRPHQVTL5L7EJ7AZ7GBT5G36JTIAUMPDOC",
    label: "GAYYQCPTA52PUTTDDNFDX5FRPHQVTL5L7EJ7AZ7GBT5G36JTIAUMPDOC",
  },
] as const;
