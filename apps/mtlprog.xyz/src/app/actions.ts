"use server";

import {
  getLocaleEffect,
  getThemeEffect,
  type Locale,
  setLocaleEffect,
  setThemeEffect,
  type Theme,
} from "@/services/settings";
import { Effect } from "effect";

// Re-export types for convenience
export type { Locale, Theme };

// Server Action wrappers for Next.js compatibility
export async function setLocale(locale: Locale) {
  return Effect.runPromise(setLocaleEffect(locale));
}

export async function setTheme(theme: Theme) {
  return Effect.runPromise(setThemeEffect(theme));
}

export async function getLocale(): Promise<Locale> {
  return Effect.runPromise(getLocaleEffect());
}

export async function getTheme(): Promise<Theme> {
  return Effect.runPromise(getThemeEffect());
}
