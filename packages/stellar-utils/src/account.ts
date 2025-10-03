/**
 * Validate Stellar account ID format
 * @param accountId - Account ID to validate
 * @returns true if valid Stellar account ID format
 *
 * @example
 * ```typescript
 * isValidStellarAccountId("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
 * // true
 *
 * isValidStellarAccountId("invalid");
 * // false
 * ```
 */
export function isValidStellarAccountId(accountId: string): boolean {
  // Stellar account ID: G followed by 55 base32 characters
  const stellarAccountPattern = /^G[A-Z0-9]{55}$/;
  return stellarAccountPattern.test(accountId);
}

/**
 * Truncate Stellar account ID for display
 * @param accountId - Full Stellar account ID
 * @param prefixLength - Number of characters to show at start (default: 2)
 * @param suffixLength - Number of characters to show at end (default: 6)
 * @returns Truncated account ID (e.g., "GA...XYZ123")
 *
 * @example
 * ```typescript
 * truncateAccountId("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
 * // "GA...2UK7V"
 *
 * truncateAccountId("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V", 4, 4);
 * // "GACK...UK7V"
 * ```
 */
export function truncateAccountId(
  accountId: string,
  prefixLength = 2,
  suffixLength = 6,
): string {
  const minLength = prefixLength + suffixLength;
  if (accountId.length < minLength) return accountId;
  return `${accountId.substring(0, prefixLength)}...${accountId.substring(accountId.length - suffixLength)}`;
}

/**
 * Format Stellar account ID for display with optional validation
 * @param accountId - Account ID to format
 * @param options - Formatting options
 * @returns Formatted account ID or error message
 *
 * @example
 * ```typescript
 * formatAccountIdForDisplay("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V");
 * // "GA...2UK7V"
 *
 * formatAccountIdForDisplay("invalid", { validate: true });
 * // "Invalid account ID"
 *
 * formatAccountIdForDisplay("GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V", { truncate: false });
 * // "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V"
 * ```
 */
export function formatAccountIdForDisplay(
  accountId: string,
  options?: Readonly<{
    validate?: boolean;
    truncate?: boolean;
    prefixLength?: number;
    suffixLength?: number;
  }>,
): string {
  const { validate = false, truncate = true, prefixLength = 2, suffixLength = 6 } = options ?? {};

  if (validate && !isValidStellarAccountId(accountId)) {
    return "Invalid account ID";
  }

  if (!truncate) {
    return accountId;
  }

  return truncateAccountId(accountId, prefixLength, suffixLength);
}
