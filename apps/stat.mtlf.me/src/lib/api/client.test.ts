import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { apiGet, ApiHttpError, ApiNotFoundError, ApiShapeError } from "./client";

type FetchFn = typeof globalThis.fetch;
const originalFetch: FetchFn = globalThis.fetch;

const mockResponse = (
  status: number,
  body: string,
  contentType = "application/json",
): Response =>
  new Response(body, {
    status,
    statusText: status === 404 ? "Not Found" : status === 500 ? "Internal Server Error" : "OK",
    headers: { "Content-Type": contentType },
  });

beforeEach(() => {
  globalThis.fetch = (() => {
    throw new Error("fetch not stubbed in this test");
  }) as FetchFn;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("apiGet", () => {
  test("returns parsed JSON on 200", async () => {
    globalThis.fetch = (async () => mockResponse(200, "{\"x\":1}")) as FetchFn;
    const result = await apiGet<{ x: number }>("/p");
    expect(result).toEqual({ x: 1 });
  });

  test("throws ApiNotFoundError on 404 with body", async () => {
    globalThis.fetch = (async () => mockResponse(404, "{\"error\":\"missing\"}")) as FetchFn;
    let caught: unknown;
    try {
      await apiGet("/missing");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiNotFoundError);
    expect((caught as ApiNotFoundError).path).toBe("/missing");
  });

  test("throws ApiHttpError on 500 with body in message", async () => {
    globalThis.fetch = (async () => mockResponse(500, "boom")) as FetchFn;
    let caught: unknown;
    try {
      await apiGet("/oops");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiHttpError);
    const err = caught as ApiHttpError;
    expect(err.status).toBe(500);
    expect(err.body).toBe("boom");
    expect(err.message).toContain("boom");
  });

  test("throws ApiShapeError on malformed JSON", async () => {
    globalThis.fetch = (async () => mockResponse(200, "<html>not json</html>")) as FetchFn;
    let caught: unknown;
    try {
      await apiGet("/bad-json");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiShapeError);
  });

  test("passes signal to fetch", async () => {
    let observedSignal: AbortSignal | undefined;
    globalThis.fetch = (async (_url, init?: RequestInit) => {
      observedSignal = init?.signal ?? undefined;
      return mockResponse(200, "{}");
    }) as FetchFn;
    const ctrl = new AbortController();
    await apiGet("/p", { signal: ctrl.signal });
    expect(observedSignal).toBe(ctrl.signal);
  });
});
