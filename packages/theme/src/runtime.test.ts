import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { clientRuntime, runClientEffect } from "./runtime";

describe("theme runtime", () => {
  describe("clientRuntime", () => {
    test("should be defined", () => {
      expect(clientRuntime).toBeDefined();
    });

    test("should be a valid Runtime", () => {
      expect(typeof clientRuntime).toBe("object");
    });
  });

  describe("runClientEffect", () => {
    test("should run a successful Effect", async () => {
      const program = Effect.succeed(42);
      const result = await runClientEffect(program);

      expect(result).toBe(42);
    });

    test("should run an Effect with string result", async () => {
      const program = Effect.succeed("hello");
      const result = await runClientEffect(program);

      expect(result).toBe("hello");
    });

    test("should run an Effect with object result", async () => {
      const obj = { name: "test", value: 123 };
      const program = Effect.succeed(obj);
      const result = await runClientEffect(program);

      expect(result).toEqual(obj);
    });

    test("should handle Effect.map transformations", async () => {
      const program = Effect.succeed(10).pipe(
        Effect.map((n) => n * 2),
      );
      const result = await runClientEffect(program);

      expect(result).toBe(20);
    });

    test("should handle Effect.flatMap chains", async () => {
      const program = Effect.succeed(5).pipe(
        Effect.flatMap((n) => Effect.succeed(n + 3)),
      );
      const result = await runClientEffect(program);

      expect(result).toBe(8);
    });

    test("should reject when Effect fails", async () => {
      const program = Effect.fail(new Error("test error"));

      await expect(runClientEffect(program)).rejects.toThrow("test error");
    });

    test("should handle async operations", async () => {
      const program = Effect.tryPromise({
        try: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return "async result";
        },
        catch: (error) => new Error(String(error)),
      });

      const result = await runClientEffect(program);
      expect(result).toBe("async result");
    });
  });
});
