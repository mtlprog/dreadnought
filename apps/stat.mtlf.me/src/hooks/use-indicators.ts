import { fetchIndicators } from "@/lib/api/indicators";
import type { Indicator } from "@/lib/api/types";
import { useEffect, useState } from "react";

interface UseIndicatorsState {
  data: Indicator[];
  isLoading: boolean;
  error: string | null;
}

export function useIndicators(): UseIndicatorsState {
  const [state, setState] = useState<UseIndicatorsState>({
    data: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setState({ data: [], isLoading: true, error: null });
        const data = await fetchIndicators();
        if (mounted) {
          setState({ data, isLoading: false, error: null });
        }
      } catch (error) {
        if (mounted) {
          setState({
            data: [],
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
