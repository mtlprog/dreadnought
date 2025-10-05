import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and tailwind-merge.
 * Handles conditional classes and merges Tailwind classes intelligently.
 *
 * @param inputs - Class names to combine
 * @returns Merged class name string
 *
 * @example
 * cn("px-2 py-1", condition && "bg-primary", { "text-white": isActive })
 * // => "px-2 py-1 bg-primary text-white"
 */
export function cn(...inputs: readonly ClassValue[]) {
  return twMerge(clsx(inputs));
}
