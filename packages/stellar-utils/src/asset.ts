import { Asset } from "@stellar/stellar-sdk";

/**
 * Stellar asset representation
 */
export interface AssetInfo {
  readonly code: string;
  readonly issuer: string;
  readonly type: "native" | "credit_alphanum4" | "credit_alphanum12";
}

/**
 * Create a Stellar Asset from AssetInfo
 * @param assetInfo - Asset information
 * @returns Stellar SDK Asset instance
 *
 * @example
 * ```typescript
 * const asset = createAsset({
 *   code: "EURMTL",
 *   issuer: "GABC...",
 *   type: "credit_alphanum4"
 * });
 * ```
 */
export function createAsset(assetInfo: AssetInfo): Asset {
  if (assetInfo.type === "native") {
    return Asset.native();
  }
  return new Asset(assetInfo.code, assetInfo.issuer);
}

/**
 * Parse asset string in format "CODE:ISSUER" or "XLM" (native)
 * @param assetString - Asset string to parse
 * @returns AssetInfo object
 *
 * @example
 * ```typescript
 * const asset1 = parseAssetString("EURMTL:GABC...");
 * // { code: "EURMTL", issuer: "GABC...", type: "credit_alphanum4" }
 *
 * const asset2 = parseAssetString("XLM");
 * // { code: "XLM", issuer: "", type: "native" }
 * ```
 */
export function parseAssetString(assetString: string): AssetInfo {
  if (assetString === "XLM" || assetString === "native") {
    return {
      code: "XLM",
      issuer: "",
      type: "native",
    };
  }

  const [code, issuer] = assetString.split(":");
  if (!code || !issuer) {
    throw new Error(`Invalid asset string format: ${assetString}`);
  }

  const type = code.length <= 4 ? "credit_alphanum4" : "credit_alphanum12";

  return {
    code,
    issuer,
    type,
  };
}

/**
 * Format AssetInfo for display
 * @param assetInfo - Asset information
 * @param showIssuer - Whether to include issuer (default: false)
 * @returns Formatted asset string
 *
 * @example
 * ```typescript
 * formatAssetDisplay({ code: "EURMTL", issuer: "GABC...", type: "credit_alphanum4" });
 * // "EURMTL"
 *
 * formatAssetDisplay({ code: "EURMTL", issuer: "GABC...", type: "credit_alphanum4" }, true);
 * // "EURMTL (GABC...)"
 * ```
 */
export function formatAssetDisplay(assetInfo: AssetInfo, showIssuer = false): string {
  if (assetInfo.type === "native") {
    return "XLM";
  }

  if (showIssuer) {
    const truncatedIssuer = truncateAccountId(assetInfo.issuer);
    return `${assetInfo.code} (${truncatedIssuer})`;
  }

  return assetInfo.code;
}

/**
 * Truncate Stellar account ID for display
 * @param accountId - Full Stellar account ID
 * @returns Truncated account ID (e.g., "GA...XYZ123")
 *
 * @example
 * ```typescript
 * truncateAccountId("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
 * // "GA...UK7V"
 * ```
 */
function truncateAccountId(accountId: string): string {
  if (accountId.length < 8) return accountId;
  return `${accountId.substring(0, 2)}...${accountId.substring(accountId.length - 4)}`;
}

/**
 * Convert Asset to AssetInfo
 * @param asset - Stellar SDK Asset
 * @returns AssetInfo object
 *
 * @example
 * ```typescript
 * const asset = new Asset("EURMTL", "GABC...");
 * const assetInfo = assetToInfo(asset);
 * // { code: "EURMTL", issuer: "GABC...", type: "credit_alphanum4" }
 * ```
 */
export function assetToInfo(asset: Asset): AssetInfo {
  if (asset.isNative()) {
    return {
      code: "XLM",
      issuer: "",
      type: "native",
    };
  }

  const type = asset.code.length <= 4 ? "credit_alphanum4" : "credit_alphanum12";

  return {
    code: asset.code,
    issuer: asset.issuer,
    type,
  };
}
