"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface TokenHoldersTableProps {
  issuerAccountId: string;
  assetCode: string;
}

export function TokenHoldersTable({ issuerAccountId, assetCode }: TokenHoldersTableProps) {
  const [holders, setHolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHolders = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/holders/${issuerAccountId}/${assetCode}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load holders");
        }

        setHolders(data.holders);
      } catch (err) {
        console.error("Failed to fetch holders:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load token holders",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchHolders();
  }, [issuerAccountId, assetCode]);

  // Format address: G1234...5678
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="border-2 border-border bg-card p-6">
        <h3 className="text-xl font-bold text-primary uppercase mb-4">
          Token Holders
        </h3>
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <div className="text-sm font-mono text-muted-foreground uppercase">
              Loading holders...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-destructive bg-card p-6">
        <h3 className="text-xl font-bold text-primary uppercase mb-4">
          Token Holders
        </h3>
        <div className="text-destructive font-mono text-sm uppercase mb-2">
          Error
        </div>
        <div className="text-foreground font-mono text-sm">{error}</div>
      </div>
    );
  }

  if (holders.length === 0) {
    return (
      <div className="border-2 border-border bg-card p-6">
        <h3 className="text-xl font-bold text-primary uppercase mb-4">
          Token Holders
        </h3>
        <div className="text-center text-muted-foreground font-mono text-sm uppercase">
          No holders found
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-border bg-card p-6">
      <h3 className="text-xl font-bold text-primary uppercase mb-4">
        Token Holders ({holders.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-2 border-border">
          <thead className="bg-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left font-bold text-primary uppercase text-xs border-r border-border">
                Account
              </th>
            </tr>
          </thead>
          <tbody>
            {holders.map((holder) => (
              <tr key={holder} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2 text-sm font-mono">
                  <a
                    href={`https://bsn.expert/accounts/${holder}`}
                    className="text-primary hover:text-accent underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {formatAddress(holder)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
