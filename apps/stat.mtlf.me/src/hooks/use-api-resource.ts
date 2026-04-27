import type { ApiGetOptions } from "@/lib/api/client";
import { describeError, logError } from "@/lib/api/log";
import { useEffect, useState } from "react";

export interface ApiResourceState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === "AbortError";

export function useApiResource<T>(
  scope: string,
  // ApiGetOptions has a runtime AbortSignal that ESLint cannot prove immutable;
  // we only ever pass it through to fetch, never mutate it.
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  fetcher: (options: ApiGetOptions) => Promise<T>,
  deps: readonly unknown[],
): ApiResourceState<T> {
  const [state, setState] = useState<ApiResourceState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    fetcher({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ data, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted) return;
        logError(scope, error);
        setState({ data: null, isLoading: false, error: describeError(error) });
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
