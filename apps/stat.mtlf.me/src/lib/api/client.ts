export const API_BASE = "https://stat.mtlprog.xyz";

export class ApiNotFoundError extends Error {
  readonly path: string;

  constructor(path: string, body?: string) {
    super(`Not found: ${path}${body !== undefined && body !== "" ? ` — ${body}` : ""}`);
    this.name = "ApiNotFoundError";
    this.path = path;
  }
}

export class ApiHttpError extends Error {
  readonly path: string;
  readonly status: number;
  readonly body: string;

  constructor(path: string, status: number, statusText: string, body: string) {
    const trimmed = body.length > 500 ? `${body.slice(0, 500)}…` : body;
    super(`HTTP ${status} ${statusText} on ${path}${trimmed !== "" ? ` — ${trimmed}` : ""}`);
    this.name = "ApiHttpError";
    this.path = path;
    this.status = status;
    this.body = body;
  }
}

export class ApiShapeError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`Invalid response shape on ${path}: ${message}`);
    this.name = "ApiShapeError";
    this.path = path;
  }
}

const safeReadBody = async (response: Response): Promise<string> => {
  try {
    return await response.text();
  } catch {
    return "";
  }
};

export interface ApiGetOptions {
  signal?: AbortSignal;
}

export async function apiGet<T>(path: string, options: ApiGetOptions = {}): Promise<T> {
  const init: RequestInit = { cache: "no-store" };
  if (options.signal !== undefined) init.signal = options.signal;
  const response = await fetch(`${API_BASE}${path}`, init);
  if (response.status === 404) {
    const body = await safeReadBody(response);
    throw new ApiNotFoundError(path, body);
  }
  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new ApiHttpError(path, response.status, response.statusText, body);
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (cause) {
    throw new ApiShapeError(path, `JSON parse failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  return parsed as T;
}
