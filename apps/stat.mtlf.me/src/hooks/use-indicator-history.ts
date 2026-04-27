import { fetchIndicatorHistory } from "@/lib/api/indicators";
import type { IndicatorSeries, Range } from "@/lib/api/types";
import { useApiResource } from "./use-api-resource";

interface UseIndicatorHistoryState {
  series: IndicatorSeries[];
  isLoading: boolean;
  error: string | null;
}

export function useIndicatorHistory(
  ids: readonly number[],
  range: Range,
): UseIndicatorHistoryState {
  // ids is an array; depending on it directly would re-fetch on every render
  // because identity changes even when contents don't. idsKey is a stable
  // string derived from contents.
  const idsKey = ids.join(",");

  const { data, isLoading, error } = useApiResource(
    "useIndicatorHistory",
    (options) => fetchIndicatorHistory(ids, range, options),
    [idsKey, range],
  );

  return {
    series: data !== null ? [...data.series] : [],
    isLoading,
    error,
  };
}
