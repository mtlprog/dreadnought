import type { FundStructureData } from "@/lib/stellar/fund-structure-service";
import { useEffect, useState } from "react";

interface UseFundDataState {
  data: FundStructureData | null;
  isLoading: boolean;
  error: string | null;
}

export function useFundData(): UseFundDataState {
  const [state, setState] = useState<UseFundDataState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setState({ data: null, isLoading: true, error: null });

        const response = await fetch("/api/fund-structure");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

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

    void fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
