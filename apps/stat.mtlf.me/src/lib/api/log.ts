export function logError(scope: string, error: unknown): void {
  if (typeof console === "undefined") return;
  console.error(`[${scope}]`, error);
}

export function logWarn(scope: string, message: string, detail?: unknown): void {
  if (typeof console === "undefined") return;
  if (detail === undefined) {
    console.warn(`[${scope}] ${message}`);
  } else {
    console.warn(`[${scope}] ${message}`, detail);
  }
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
