import type { FundDataFetchError, FundDataNetworkError, FundDataParseError } from "@/lib/errors/fund-data-errors";
import { FundDataClientLive, FundDataClientTag } from "@/lib/services/fund-data-client";
import type { FundStructureData } from "@/lib/stellar/fund-structure-service";
import { Effect, pipe } from "effect";
import { useEffect, useRef, useState } from "react";

interface UseFundDataState {
  data: FundStructureData | null;
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export function useFundData(): UseFundDataState {
  const [state, setState] = useState<UseFundDataState>({
    data: null,
    isLoading: true,
    error: null,
    progress: 0,
  });

  const progressIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const updateState = (updates: Readonly<Partial<UseFundDataState>>) => {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, ...updates }));
      }
    };

    const fetchData = () => {
      updateState({
        isLoading: true,
        error: null,
        progress: 10,
      });

      // Start progress simulation
      progressIntervalRef.current = setInterval(() => {
        setState(prev => {
          const newProgress = prev.progress + Math.random() * 20;
          return {
            ...prev,
            progress: newProgress >= 90 ? 90 : newProgress,
          };
        });
      }, 500);

      const program = pipe(
        FundDataClientTag,
        Effect.flatMap(client => client.fetchFundStructure()),
        Effect.tap(() => {
          if (isMountedRef.current) {
            updateState({ progress: 95 });
          }
        }),
        Effect.map(data => {
          if (isMountedRef.current) {
            updateState({ progress: 100 });
            // Small delay to show completion
            setTimeout(() => {
              if (isMountedRef.current) {
                updateState({
                  data,
                  isLoading: false,
                  progress: 100,
                });
              }
            }, 300);
          }
          return data;
        }),
        Effect.catchAll((error: FundDataFetchError | FundDataParseError | FundDataNetworkError) =>
          pipe(
            Effect.sync(() => {
              if (isMountedRef.current) {
                updateState({
                  error: error.message,
                  isLoading: false,
                  progress: 0,
                });
              }
            }),
            Effect.tap(() => Effect.logError(`Fund data fetch failed: ${error.message}`)),
            Effect.flatMap(() => Effect.fail(error)),
          )
        ),
        Effect.provide(FundDataClientLive),
      );

      void Effect.runPromise(
        pipe(
          program,
          Effect.catchAll((error) =>
            Effect.sync(() => {
              if (isMountedRef.current) {
                updateState({
                  error: error instanceof Error ? error.message : "Unknown error occurred",
                  isLoading: false,
                  progress: 0,
                });
              }
            })
          ),
        ),
      );
    };

    fetchData();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  return state;
}
