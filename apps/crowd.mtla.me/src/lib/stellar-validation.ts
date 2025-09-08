// Client-side Stellar validation utilities
// This file should only be imported in client components

export function isValidStellarAccountId(accountId: string): boolean {
  // Basic validation for Stellar account ID format
  // G followed by 55 characters (base32 encoded)
  const stellarAccountPattern = /^G[A-Z0-9]{55}$/;
  return stellarAccountPattern.test(accountId);
}

export function truncateAccountId(accountId: string): string {
  if (accountId.length < 8) return accountId;
  return `${accountId.substring(0, 2)}...${accountId.substring(accountId.length - 6)}`;
}
