"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface AuthState {
  isAuthenticated: boolean;
  publicKey: string | null;
  userId: number | null;
  isLoading: boolean;
  challengeXDR: string | null;
  telegramUrl: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    publicKey: null,
    userId: null,
    isLoading: true,
    challengeXDR: null,
    telegramUrl: null,
  });

  // Check authentication status on mount and after window focus
  useEffect(() => {
    checkAuthStatus();

    // Recheck auth when window gains focus (after signing in widget)
    const handleFocus = () => {
      checkAuthStatus();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status");
      const data = await response.json();

      setState((prev) => ({
        ...prev,
        isAuthenticated: data.authenticated,
        publicKey: data.publicKey || null,
        userId: data.userId || null,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const startAuth = useCallback(async (publicKey: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Request challenge from server
      const challengeResponse = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey }),
      });

      if (!challengeResponse.ok) {
        const error = await challengeResponse.json();
        toast.error(`Challenge failed: ${error.error}`);
        setState((prev) => ({ ...prev, isLoading: false }));
        return null;
      }

      const { transaction } = await challengeResponse.json();

      setState((prev) => ({
        ...prev,
        challengeXDR: transaction,
        isLoading: false,
      }));

      return transaction;
    } catch (error) {
      console.error("Start auth error:", error);
      toast.error("Failed to start authentication");
      setState((prev) => ({ ...prev, isLoading: false }));
      return null;
    }
  }, []);

  const getStellarUri = useCallback((xdr: string) => {
    const callbackUrl = `${window.location.origin}/api/auth/callback`;
    const params = new URLSearchParams({
      xdr,
      callback: `url:${callbackUrl}`,
    });

    return `web+stellar:tx?${params.toString()}`;
  }, []);

  const sendToMMWB = useCallback(async (stellarUri: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch("/api/stellar-uri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stellarUri }),
      });

      if (!response.ok) {
        throw new Error("Failed to send to MMWB");
      }

      const { telegramUrl } = await response.json();

      setState((prev) => ({
        ...prev,
        telegramUrl,
        isLoading: false,
      }));

      // Open Telegram URL
      if (telegramUrl) {
        window.open(telegramUrl, "_blank");
        toast.info("Please sign the transaction in Telegram bot");
      }
    } catch (error) {
      console.error("MMWB error:", error);
      toast.error("Failed to send to signing widget. Please use SEP-0007 link instead.");
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await fetch("/api/auth/logout", { method: "POST" });

      setState({
        isAuthenticated: false,
        publicKey: null,
        userId: null,
        isLoading: false,
        challengeXDR: null,
        telegramUrl: null,
      });

      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  return {
    ...state,
    startAuth,
    getStellarUri,
    sendToMMWB,
    logout,
    refresh: checkAuthStatus,
  };
}
