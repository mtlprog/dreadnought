import type { FundDataFetchError, FundDataNetworkError, FundDataParseError } from "@/lib/errors/fund-data-errors";
import { FundDataClientLive, FundDataClientTag } from "@/lib/services/fund-data-client";
import type { FundStructureData } from "@/lib/stellar/fund-structure-service";
import { Effect, pipe, Schedule } from "effect";
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

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const updateState = (updates: Readonly<Partial<UseFundDataState>>) => {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, ...updates }));
      }
    };

    const createProgressUpdater = () => {
      const progressSchedule = Schedule.fixed("500 millis");

      return pipe(
        Effect.sync(() => {
          setState(prev => {
            const newProgress = prev.progress + Math.random() * 20;
            return {
              ...prev,
              progress: newProgress >= 90 ? 90 : newProgress,
            };
          });
        }),
        Effect.repeat(progressSchedule),
        Effect.timeout("30 seconds"), // Safety timeout
        Effect.catchAll(() => Effect.void) // Ignore timeout errors
      );
    };

    const fetchData = () => {
      updateState({
        isLoading: true,
        error: null,
        progress: 10,
      });

      const program = pipe(
        Effect.all([
          // Start progress simulation in background
          Effect.fork(createProgressUpdater()),
          // Fetch data
          pipe(
            FundDataClientTag,
            Effect.flatMap(client => client.fetchFundStructure()),
            Effect.tap(() => {
              if (isMountedRef.current) {
                updateState({ progress: 95 });
              }
            }),
            Effect.tap(() =>
              pipe(
                Effect.delay(Effect.sync(() => {
                  if (isMountedRef.current) {
                    updateState({ progress: 100 });
                  }
                }), "300 millis")
              )
            ),
            Effect.tap((data) =>
              pipe(
                Effect.delay(Effect.sync(() => {
                  if (isMountedRef.current) {
                    updateState({
                      data,
                      isLoading: false,
                      progress: 100,
                    });
                  }
                }), "300 millis")
              )
            )
          )
        ]),
        Effect.map(([_progressFiber, data]) => data),
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
    };
  }, []);

  return state;
}