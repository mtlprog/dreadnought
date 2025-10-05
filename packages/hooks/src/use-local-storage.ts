"use client";

import { Effect, pipe } from "effect";
import { useEffect, useState } from "react";

/**
 * Custom hook for managing state in localStorage with Effect-TS
 *
 * @param key - The localStorage key
 * @param initialValue - The initial value if key doesn't exist
 * @returns Tuple of [storedValue, setValue]
 *
 * @example
 * const [theme, setTheme] = useLocalStorage<string>("theme", "dark");
 * setTheme("light");
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Get from local storage then parse stored json or return initialValue
  useEffect(() => {
    const program = pipe(
      Effect.sync(() => {
        if (typeof window !== "undefined" && window.localStorage) {
          const item = window.localStorage.getItem(key);
          if (item !== null && item !== "") {
            return JSON.parse(item) as T;
          }
        }
        return initialValue;
      }),
      Effect.tap((value) => Effect.sync(() => setStoredValue(value))),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          Effect.logError(`Error reading localStorage key "${key}":`, error);
        })
      ),
    );

    void Effect.runSync(program);
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T) => {
    const program = pipe(
      Effect.sync(() => {
        setStoredValue(value);
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      }),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          Effect.logError(`Error setting localStorage key "${key}":`, error);
        })
      ),
    );

    void Effect.runSync(program);
  };

  return [storedValue, setValue];
}
