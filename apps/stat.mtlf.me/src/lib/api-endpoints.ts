export const API_ENDPOINTS = [
  { value: "https://stat.mtlprog.xyz", label: "stat.mtlprog.xyz" },
  { value: "", label: "stat.mtlf.me" },
] as const;

export const DEFAULT_ENDPOINT = "https://stat.mtlprog.xyz";

const STORAGE_KEY = "stat-mtlf-api-endpoint";

const ALLOWED_VALUES: Set<string> = new Set(API_ENDPOINTS.map((ep) => ep.value));

export function loadEndpoint(): string {
  if (typeof window === "undefined") return DEFAULT_ENDPOINT;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored != null && ALLOWED_VALUES.has(stored)) return stored;
  return DEFAULT_ENDPOINT;
}

export function saveEndpoint(endpoint: string): void {
  localStorage.setItem(STORAGE_KEY, endpoint);
}
