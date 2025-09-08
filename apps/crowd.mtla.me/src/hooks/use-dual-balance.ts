import { isValidStellarAccountId } from "@/lib/stellar-validation";
import { Effect, pipe } from "effect";
import { useCallback, useRef, useState } from "react";

interface DualBalance {
  mtlCrowd: string;
  eurMtl: string;
}

export function useDualBalance() {
  const [balance, setBalance] = useState<DualBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCheckedAccountRef = useRef<string | null>(null);

  const checkBalance = useCallback((accountId: string) => {
    if (accountId === "" || isValidStellarAccountId(accountId) === false) {
      setBalance(null);
      setError(null);
      return;
    }

    // Don't check the same account multiple times
    if (accountId === lastCheckedAccountRef.current && !isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    lastCheckedAccountRef.current = accountId;

    const program = pipe(
      Effect.tryPromise({
        try: () =>
          fetch("/api/balance", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ accountId }),
          }),
        catch: () => new Error("Network request failed"),
      }),
      Effect.flatMap(response =>
        Effect.tryPromise({
          try: () =>
            response.json() as Promise<{
              success: boolean;
              balance?: string;
              mtlCrowd?: string;
              eurMtl?: string;
              error?: string;
            }>,
          catch: () => new Error("Failed to parse response"),
        })
      ),
      Effect.tap((result) => {
        if (result.success && result.mtlCrowd !== undefined && result.eurMtl !== undefined) {
          setBalance({
            mtlCrowd: result.mtlCrowd,
            eurMtl: result.eurMtl,
          });
        } else {
          setError(result.error ?? "Failed to load balance");
          setBalance(null);
        }
        return Effect.void;
      }),
      Effect.catchAll((err) =>
        Effect.sync(() => {
          Effect.logError("Error checking balance", err);
          setError("Failed to check balance");
          setBalance(null);
        })
      ),
      Effect.tap(() => Effect.sync(() => setIsLoading(false))),
    );

    void Effect.runPromise(program);
  }, [isLoading]);

  const clearBalance = useCallback(() => {
    setBalance(null);
    setError(null);
    setIsLoading(false);
    lastCheckedAccountRef.current = null;
  }, []);

  return {
    balance,
    isLoading,
    error,
    checkBalance,
    clearBalance,
  };
}
