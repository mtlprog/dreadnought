import { fetchIndicators, fetchIndicatorsByDate } from "@/lib/api/indicators";
import type { Indicator } from "@/lib/api/types";
import { useApiResource } from "./use-api-resource";

interface UseIndicatorsState {
  data: Indicator[];
  isLoading: boolean;
  error: string | null;
}

export function useIndicators(date?: string | null): UseIndicatorsState {
  const dateKey = date?.split("T")[0] ?? null;
  const { data, isLoading, error } = useApiResource(
    "useIndicators",
    (options) => (dateKey !== null ? fetchIndicatorsByDate(dateKey, options) : fetchIndicators(options)),
    [dateKey],
  );
  return { data: data ?? [], isLoading, error };
}
