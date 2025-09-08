import { isValidStellarAccountId } from "@/lib/stellar-validation";
import { useCallback, useRef, useState } from "react";

export function useStellarBalance() {
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCheckedAccountRef = useRef<string | null>(null);

  const checkBalance = useCallback(async (accountId: string) => {
    if (accountId === "" || !isValidStellarAccountId(accountId)) {
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

    try {
      const response = await fetch("/api/balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId }),
      });

      const result = await response.json() as { success: boolean; balance?: string; error?: string };

      if (result.success && result.balance !== undefined) {
        setBalance(result.balance);
      } else {
        setError(result.error ?? "Failed to load balance");
        setBalance(null);
      }
    } catch (error) {
      console.error("Error checking balance:", error);
      setError("Failed to check balance");
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
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
