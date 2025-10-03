/**
 * Supported locales for the application
 */
export type Locale = "ru" | "en";

/**
 * Format number with locale-specific formatting to prevent hydration errors.
 *
 * This utility ensures consistent number formatting between server and client
 * by using explicit locale strings instead of browser defaults.
 *
 * @param value - The number to format
 * @param locale - The locale to use ("ru" for Russian, "en" for English)
 * @returns Formatted number string (e.g., "1,000" for en-US, "1 000" for ru-RU)
 *
 * @example
 * ```ts
 * formatNumber(1000, "ru") // "1 000"
 * formatNumber(1000, "en") // "1,000"
 * formatNumber(1234.56, "ru") // "1 234,56"
 * ```
 */
export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
}
