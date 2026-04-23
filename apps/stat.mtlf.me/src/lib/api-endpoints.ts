export const API_ENDPOINTS = [
  { value: "https://stat.mtlprog.xyz", label: "stat.mtlprog.xyz" },
  { value: "", label: "stat.mtlf.me" },
] as const;

export const DEFAULT_ENDPOINT = "https://stat.mtlprog.xyz";

export const LOCAL_SENTINEL = "__local__";

const STORAGE_KEY = "stat-mtlf-api-endpoint";

const ALLOWED_VALUES: Set<string> = new Set(API_ENDPOINTS.map((ep) => ep.value));

export function loadEndpoint(): string {
  if (typeof window === "undefined") return DEFAULT_ENDPOINT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored != null && ALLOWED_VALUES.has(stored)) return stored;
  } catch {
    // localStorage inaccessible (private browsing, iframe restrictions)
  }
  return DEFAULT_ENDPOINT;
}

export function saveEndpoint(endpoint: string): void {
  if (!ALLOWED_VALUES.has(endpoint)) return;
  try {
    localStorage.setItem(STORAGE_KEY, endpoint);
  } catch {
    // localStorage inaccessible
  }
}
