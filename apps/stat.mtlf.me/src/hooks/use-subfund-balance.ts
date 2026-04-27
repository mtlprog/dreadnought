import { fetchBalanceBySubfund } from "@/lib/api/charts";
import type { BalanceBySubfund } from "@/lib/api/types";
import { useApiResource } from "./use-api-resource";

interface UseSubfundBalanceState {
  data: BalanceBySubfund | null;
  isLoading: boolean;
  error: string | null;
}

export function useSubfundBalance(): UseSubfundBalanceState {
  return useApiResource<BalanceBySubfund>(
    "useSubfundBalance",
    (options) => fetchBalanceBySubfund(options),
    [],
  );
}
