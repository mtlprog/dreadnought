"use client";

import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params["accountId"] as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId || accountId.length !== 56 || !accountId.startsWith("G")) {
      setError("Invalid account ID");
      return;
    }

    const fetchAndRedirect = async () => {
      try {
        const response = await fetch(`/api/contracts/${accountId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load contracts");
        }

        if (data.contracts.length > 0) {
          // Redirect to the first available asset
          router.replace(`/${accountId}/${data.contracts[0].assetCode}`);
        } else {
          setError("No contracts found for this account");
        }
      } catch (err) {
        console.error("Failed to fetch contracts:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load contracts from account",
        );
      }
    };

    void fetchAndRedirect();
  }, [accountId, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {error ? (
        <div className="border-2 border-destructive bg-card p-12">
          <div className="text-destructive font-mono text-sm uppercase mb-2">
            Error
          </div>
          <div className="text-foreground font-mono text-sm">{error}</div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-sm font-mono text-muted-foreground uppercase">
            Loading contracts...
          </div>
        </div>
      )}
    </div>
  );
}
