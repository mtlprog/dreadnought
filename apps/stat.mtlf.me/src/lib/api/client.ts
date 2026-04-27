export const API_BASE = "https://stat.mtlprog.xyz";

export class ApiNotFoundError extends Error {
  readonly path: string;

  constructor(path: string) {
    super(`Not found: ${path}`);
    this.name = "ApiNotFoundError";
    this.path = path;
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store", ...init });
  if (response.status === 404) {
    throw new ApiNotFoundError(path);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} on ${path}`);
  }
  return response.json() as Promise<T>;
}
