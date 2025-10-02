import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: readonly ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number with thin space separators for thousands.
 * Uses non-breaking thin space (U+202F) for proper monospace font rendering.
 *
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with thin space separators
 *
 * @example
 * formatNumber(1234567.89, 2) // "1 234 567.89"
 * formatNumber(1234.5678, 7)  // "1 234.5678000"
 */
export function formatNumber(value: number, decimals: number = 2): string {
  const fixed = value.toFixed(decimals);
  const parts = fixed.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Add thin space separators for thousands (from right to left)
  const formatted = integerPart?.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F") ?? "";

  return decimalPart != null ? `${formatted}.${decimalPart}` : formatted;
}
