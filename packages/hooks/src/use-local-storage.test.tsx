import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { useLocalStorage } from "./use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("should return initial value when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    expect(result.current[0]).toBe("initial");
  });

  test("should return value from localStorage when it exists", () => {
    localStorage.setItem("test-key", JSON.stringify("stored-value"));

    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    expect(result.current[0]).toBe("stored-value");
  });

  test("should update localStorage when setValue is called", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("new-value");
    });

    expect(result.current[0]).toBe("new-value");
    expect(localStorage.getItem("test-key")).toBe(JSON.stringify("new-value"));
  });

  test("should work with objects", () => {
    const initialObject = { name: "John", age: 30 };
    const { result } = renderHook(() => useLocalStorage("test-object", initialObject));

    expect(result.current[0]).toEqual(initialObject);

    const newObject = { name: "Jane", age: 25 };
    act(() => {
      result.current[1](newObject);
    });

    expect(result.current[0]).toEqual(newObject);
    expect(JSON.parse(localStorage.getItem("test-object") ?? "{}")).toEqual(newObject);
  });

  test("should work with arrays", () => {
    const initialArray = [1, 2, 3];
    const { result } = renderHook(() => useLocalStorage("test-array", initialArray));

    expect(result.current[0]).toEqual(initialArray);

    const newArray = [4, 5, 6];
    act(() => {
      result.current[1](newArray);
    });

    expect(result.current[0]).toEqual(newArray);
    expect(JSON.parse(localStorage.getItem("test-array") ?? "[]")).toEqual(newArray);
  });

  test("should work with numbers", () => {
    const { result } = renderHook(() => useLocalStorage("test-number", 42));

    expect(result.current[0]).toBe(42);

    act(() => {
      result.current[1](100);
    });

    expect(result.current[0]).toBe(100);
    expect(JSON.parse(localStorage.getItem("test-number") ?? "0")).toBe(100);
  });

  test("should work with booleans", () => {
    const { result } = renderHook(() => useLocalStorage("test-boolean", true));

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(JSON.parse(localStorage.getItem("test-boolean") ?? "true")).toBe(false);
  });

  test("should handle empty string in localStorage", () => {
    localStorage.setItem("test-key", "");

    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    expect(result.current[0]).toBe("initial");
  });

  test("should update state when key changes", () => {
    localStorage.setItem("key1", JSON.stringify("value1"));
    localStorage.setItem("key2", JSON.stringify("value2"));

    const { result, rerender } = renderHook(
      ({ key }) => useLocalStorage(key, "initial"),
      { initialProps: { key: "key1" } },
    );

    expect(result.current[0]).toBe("value1");

    rerender({ key: "key2" });

    expect(result.current[0]).toBe("value2");
  });

  test("should use new initial value when it changes", () => {
    const { result, rerender } = renderHook(
      ({ initialValue }) => useLocalStorage("test-key", initialValue),
      { initialProps: { initialValue: "initial1" } },
    );

    expect(result.current[0]).toBe("initial1");

    rerender({ initialValue: "initial2" });

    expect(result.current[0]).toBe("initial2");
  });
});
