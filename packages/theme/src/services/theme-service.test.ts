import { describe, expect, test } from "bun:test";
import { ServerActionError, type Theme } from "./theme-service";

describe("theme-service", () => {
  describe("Theme type", () => {
    test("should accept valid theme values", () => {
      const themes: Theme[] = ["system", "light", "dark"];

      themes.forEach((theme) => {
        expect(["system", "light", "dark"]).toContain(theme);
      });
    });
  });

  describe("ServerActionError", () => {
    test("should create error with message", () => {
      const error = new ServerActionError({
        message: "Test error",
      });

      expect(error.message).toBe("Test error");
      expect(error._tag).toBe("ServerActionError");
    });

    test("should create error with message and cause", () => {
      const cause = new Error("Original error");
      const error = new ServerActionError({
        message: "Wrapped error",
        cause,
      });

      expect(error.message).toBe("Wrapped error");
      expect(error.cause).toBe(cause);
      expect(error._tag).toBe("ServerActionError");
    });

    test("should be an instance of Error", () => {
      const error = new ServerActionError({
        message: "Test",
      });

      expect(error).toBeInstanceOf(Error);
    });

    test("should have correct tag", () => {
      const error = new ServerActionError({
        message: "Test",
      });

      expect(error._tag).toBe("ServerActionError");
    });
  });
});
