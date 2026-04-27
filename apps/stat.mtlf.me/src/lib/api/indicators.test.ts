import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { fetchIndicators } from "./indicators";

type FetchFn = typeof globalThis.fetch;
const originalFetch: FetchFn = globalThis.fetch;

const respond = (status: number, body: string): Response =>
  new Response(body, {
    status,
    statusText: status === 404 ? "Not Found" : status === 500 ? "Server Error" : "OK",
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  globalThis.fetch = (() => {
    throw new Error("fetch not stubbed in this test");
  }) as FetchFn;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchIndicators", () => {
  test("returns parsed array on 200", async () => {
    globalThis.fetch =
      (async () =>
        respond(200, JSON.stringify([{ id: 3, name: "X", description: "", unit: "EURMTL", value: "1" }]))) as FetchFn;
    const result = await fetchIndicators();
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(3);
  });

  test("returns empty list on 404 (no indicators yet)", async () => {
    globalThis.fetch = (async () => respond(404, "{\"error\":\"no indicators found\"}")) as FetchFn;
    const result = await fetchIndicators();
    expect(result).toEqual([]);
  });

  test("propagates non-404 errors", async () => {
    globalThis.fetch = (async () => respond(500, "boom")) as FetchFn;
    let caught: unknown;
    try {
      await fetchIndicators();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
  });
});
