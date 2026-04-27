import { fetchBalanceBySubfund } from "@/lib/api/charts";
import type { BalanceBySubfund } from "@/lib/api/types";
import { useEffect, useState } from "react";

interface UseSubfundBalanceState {
  data: BalanceBySubfund | null;
  isLoading: boolean;
  error: string | null;
}

export function useSubfundBalance(): UseSubfundBalanceState {
  const [state, setState] = useState<UseSubfundBalanceState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setState({ data: null, isLoading: true, error: null });
        const data = await fetchBalanceBySubfund();
        if (mounted) {
          setState({ data, isLoading: false, error: null });
        }
      } catch (error) {
        if (mounted) {
          setState({
            data: null,
            isLoading: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
