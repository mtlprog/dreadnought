import { fetchIndicatorHistory } from "@/lib/api/indicators";
import type { IndicatorSeries, Range } from "@/lib/api/types";
import { useEffect, useState } from "react";

interface UseIndicatorHistoryState {
  series: IndicatorSeries[];
  isLoading: boolean;
  error: string | null;
}

export function useIndicatorHistory(
  ids: readonly number[],
  range: Range,
): UseIndicatorHistoryState {
  const [state, setState] = useState<UseIndicatorHistoryState>({
    series: [],
    isLoading: true,
    error: null,
  });

  const idsKey = ids.join(",");

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        const result = await fetchIndicatorHistory(ids, range);
        if (mounted) {
          setState({ series: [...result.series], isLoading: false, error: null });
        }
      } catch (error) {
        if (mounted) {
          setState({
            series: [],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, range]);

  return state;
}
