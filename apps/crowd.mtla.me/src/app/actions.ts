"use server";

import { getThemeEffect, setThemeEffect, type Theme } from "@/services/settings";
import { Effect } from "effect";

export type { Theme };

export async function setTheme(theme: Theme) {
  return Effect.runPromise(setThemeEffect(theme));
}

export async function getTheme(): Promise<Theme> {
  return Effect.runPromise(getThemeEffect());
}
