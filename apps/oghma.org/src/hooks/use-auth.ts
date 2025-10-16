"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isFreighterInstalled,
  connectFreighter,
  signWithFreighter,
} from "@/lib/stellar/freighter";
import { toast } from "sonner";

interface AuthState {
  isAuthenticated: boolean;
  publicKey: string | null;
  userId: number | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    publicKey: null,
    userId: null,
    isLoading: true,
  });

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status");
      const data = await response.json();

      setState({
        isAuthenticated: data.authenticated,
        publicKey: data.publicKey || null,
        userId: data.userId || null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const login = useCallback(async () => {
    // Check if Freighter is installed
    if (!isFreighterInstalled()) {
      toast.error("Please install Freighter wallet extension");
      window.open("https://www.freighter.app/", "_blank");
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Step 1: Connect to Freighter
      toast.info("Connecting to Freighter...");
      const publicKey = await connectFreighter();

      if (!publicKey) {
        toast.error("Failed to connect to Freighter");
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Step 2: Request challenge from server
      toast.info("Requesting challenge from server...");
      const challengeResponse = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey }),
      });

      if (!challengeResponse.ok) {
        const error = await challengeResponse.json();
        toast.error(`Challenge failed: ${error.error}`);
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const { transaction, networkPassphrase } = await challengeResponse.json();

      // Step 3: Sign transaction with Freighter
      toast.info("Please sign the transaction in Freighter...");
      const signedTransaction = await signWithFreighter(
        transaction,
        networkPassphrase
      );

      if (!signedTransaction) {
        toast.error("Failed to sign transaction");
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Step 4: Verify signed transaction with server
      toast.info("Verifying signature...");
      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction: signedTransaction,
          publicKey,
        }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        toast.error(`Verification failed: ${error.error}`);
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const { userId } = await verifyResponse.json();

      // Success!
      toast.success("Successfully authenticated!");
      setState({
        isAuthenticated: true,
        publicKey,
        userId,
        isLoading: false,
      });
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Authentication failed");
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
    login,
    logout,
    refresh: checkAuthStatus,
  };
}
