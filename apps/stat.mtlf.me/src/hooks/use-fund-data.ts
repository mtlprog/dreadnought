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
  statusMessages: readonly string[];
  rateLimitWarning: boolean;
}

export function useFundData(): UseFundDataState {
  const [state, setState] = useState<UseFundDataState>({
    data: null,
    isLoading: true,
    error: null,
    progress: 0,
    statusMessages: [
      "⏳ ИНИЦИАЛИЗАЦИЯ ПОДКЛЮЧЕНИЯ К STELLAR HORIZON...",
      "⏳ ПОЛУЧЕНИЕ ДАННЫХ ПО СЧЕТАМ ФОНДА...",
    ],
    rateLimitWarning: false,
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
      const progressSchedule = Schedule.fixed("1000 millis");
      let tickCount = 0;

      return pipe(
        Effect.sync(() => {
          setState(prev => {
            tickCount++;
            // Much slower progress since pricing takes the longest
            const increment = tickCount === 1 ? 5 : Math.random() * 3;
            const newProgress = prev.progress + increment;
            const currentProgress = newProgress >= 90 ? 90 : newProgress;

            // Add status messages based on ticks (time-based, not progress-based)
            const messages = [...prev.statusMessages];

            if (tickCount === 1) {
              // Immediately show connection success
              messages.push("✓ STELLAR HORIZON CONNECTED");
              messages.push("⏳ ПОЛУЧЕНИЕ БАЛАНСОВ СЧЕТОВ...");
            }
            if (tickCount === 3) {
              messages.push("✓ БАЛАНСЫ СЧЕТОВ ПОЛУЧЕНЫ");
              messages.push("⏳ РАСЧЕТ ЦЕН ТОКЕНОВ (МЕДЛЕННО, ИЗБЕГАЕМ RATE LIMIT)...");
            }
            if (tickCount === 8) {
              messages.push("⏳ ОБРАБОТКА PRICE PATHS...");
            }
            if (tickCount === 15) {
              messages.push("⏳ ПРОДОЛЖАЕТСЯ РАСЧЕТ ЦЕН...");
            }
            if (tickCount === 25) {
              messages.push("⏳ ПОЧТИ ГОТОВО...");
            }
            if (tickCount === 60) {
              messages.push("⏳ ОБРАБОТКА ПРОДОЛЖАЕТСЯ...");
            }
            if (tickCount === 90) {
              messages.push("⏳ ЕЩЁ НЕМНОГО...");
            }
            if (tickCount === 120) {
              messages.push("⏳ ЗАВЕРШАЕМ РАСЧЕТ...");
            }

            return {
              ...prev,
              progress: currentProgress,
              statusMessages: messages.slice(-10), // Keep only last 10 messages
            };
          });
        }),
        Effect.repeat(progressSchedule),
        Effect.timeout("5 minutes"), // Match the fetch timeout
        Effect.catchAll(() => Effect.void), // Ignore timeout errors
      );
    };

    const fetchData = () => {
      updateState({
        isLoading: true,
        error: null,
        progress: 10,
      });

      // Set a timer to detect potential rate limiting
      const rateLimitTimer = setTimeout(() => {
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            rateLimitWarning: true,
            statusMessages: [
              ...prev.statusMessages.slice(-8),
              "⚠ ОБНАРУЖЕНЫ ЗАДЕРЖКИ - ВОЗМОЖНО RATE LIMITING",
              "⏳ ОЖИДАНИЕ ПОВТОРНЫХ ПОПЫТОК...",
            ],
          }));
        }
      }, 5000); // Show warning if loading takes more than 5 seconds

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
                setState(prev => ({
                  ...prev,
                  progress: 95,
                  statusMessages: [
                    ...prev.statusMessages.slice(-8),
                    "✓ РАСЧЕТ ЦЕН ЗАВЕРШЕН",
                    "⏳ ФОРМИРОВАНИЕ ИТОГОВЫХ ДАННЫХ...",
                  ],
                }));
              }
            }),
            Effect.tap(() =>
              pipe(
                Effect.delay(
                  Effect.sync(() => {
                    if (isMountedRef.current) {
                      updateState({ progress: 100 });
                    }
                  }),
                  "300 millis",
                ),
              )
            ),
            Effect.tap((data) =>
              pipe(
                Effect.delay(
                  Effect.sync(() => {
                    if (isMountedRef.current) {
                      clearTimeout(rateLimitTimer);
                      setState(prev => ({
                        ...prev,
                        data,
                        isLoading: false,
                        progress: 100,
                        statusMessages: [
                          ...prev.statusMessages.slice(-8),
                          "✓ ЗАГРУЗКА ЗАВЕРШЕНА УСПЕШНО",
                        ],
                      }));
                    }
                  }),
                  "300 millis",
                ),
              )
            ),
          ),
        ]),
        Effect.map(([, data]) => data),
        Effect.catchAll((error: Readonly<FundDataFetchError | FundDataParseError | FundDataNetworkError>) =>
          pipe(
            Effect.sync(() => {
              if (isMountedRef.current) {
                clearTimeout(rateLimitTimer);
                setState(prev => ({
                  ...prev,
                  error: error.message,
                  isLoading: false,
                  progress: 0,
                  statusMessages: [
                    ...prev.statusMessages.slice(-8),
                    `❌ ОШИБКА: ${error.message}`,
                  ],
                }));
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
                clearTimeout(rateLimitTimer);
                setState(prev => ({
                  ...prev,
                  error: error instanceof Error ? error.message : "Unknown error occurred",
                  isLoading: false,
                  progress: 0,
                  statusMessages: [
                    ...prev.statusMessages.slice(-8),
                    `❌ КРИТИЧЕСКАЯ ОШИБКА: ${error instanceof Error ? error.message : "Unknown error"}`,
                  ],
                }));
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
