// Freighter API types
export interface FreighterAPI {
  isConnected: () => Promise<boolean>;
  getPublicKey: () => Promise<string>;
  signTransaction: (
    xdr: string,
    options?: {
      network?: string;
      networkPassphrase?: string;
      accountToSign?: string;
    }
  ) => Promise<string>;
  getNetwork: () => Promise<string>;
  getNetworkDetails: () => Promise<{
    network: string;
    networkPassphrase: string;
  }>;
}

// Extend Window interface for Freighter
declare global {
  interface Window {
    freighter?: FreighterAPI;
  }
}

// Check if Freighter is installed
export function isFreighterInstalled(): boolean {
  return typeof window !== "undefined" && !!window.freighter;
}

// Get Freighter API
export function getFreighterAPI(): FreighterAPI | null {
  if (typeof window === "undefined" || !window.freighter) {
    return null;
  }
  return window.freighter;
}

// Connect to Freighter and get public key
export async function connectFreighter(): Promise<string | null> {
  const freighter = getFreighterAPI();
  if (!freighter) {
    throw new Error("Freighter is not installed");
  }

  try {
    const publicKey = await freighter.getPublicKey();
    return publicKey;
  } catch (error) {
    console.error("Failed to connect to Freighter:", error);
    return null;
  }
}

// Sign transaction with Freighter
export async function signWithFreighter(
  transactionXDR: string,
  networkPassphrase: string
): Promise<string | null> {
  const freighter = getFreighterAPI();
  if (!freighter) {
    throw new Error("Freighter is not installed");
  }

  try {
    const signedXDR = await freighter.signTransaction(transactionXDR, {
      networkPassphrase,
    });
    return signedXDR;
  } catch (error) {
    console.error("Failed to sign transaction with Freighter:", error);
    return null;
  }
}
