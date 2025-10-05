import { describe, expect, test } from "bun:test";
import { cn } from "./cn";

describe("cn", () => {
  test("should combine basic class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  test("should handle conditional classes", () => {
    const condition1 = true;
    const condition2 = false;
    expect(cn("px-2", condition1 && "py-1")).toBe("px-2 py-1");
    expect(cn("px-2", condition2 && "py-1")).toBe("px-2");
  });

  test("should handle object syntax", () => {
    expect(cn({ "px-2": true, "py-1": false })).toBe("px-2");
    expect(cn({ "px-2": true, "py-1": true })).toBe("px-2 py-1");
  });

  test("should merge conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("py-1", "py-2")).toBe("py-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  test("should handle arrays", () => {
    expect(cn(["px-2", "py-1"])).toBe("px-2 py-1");
    const condition = false;
    expect(cn(["px-2", condition && "py-1"])).toBe("px-2");
  });

  test("should handle complex combinations", () => {
    const isActive = true;
    const isDisabled = false;

    expect(
      cn(
        "px-2 py-1",
        isActive && "bg-primary",
        { "text-white": isActive, "opacity-50": isDisabled },
      ),
    ).toBe("px-2 py-1 bg-primary text-white");
  });

  test("should handle empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
    expect(cn(undefined)).toBe("");
    expect(cn(null)).toBe("");
  });

  test("should handle multiple conflicting classes", () => {
    expect(cn("px-2 py-1", "px-4 py-2", "px-6")).toBe("py-2 px-6");
  });
});
