import { fetchIndicators } from "@/lib/api/indicators";
import type { Indicator } from "@/lib/api/types";
import { useApiResource } from "./use-api-resource";

interface UseIndicatorsState {
  data: Indicator[];
  isLoading: boolean;
  error: string | null;
}

export function useIndicators(): UseIndicatorsState {
  const { data, isLoading, error } = useApiResource(
    "useIndicators",
    (options) => fetchIndicators(options),
    [],
  );
  return { data: data ?? [], isLoading, error };
}
