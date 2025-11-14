"use client";

import { AccountSelector } from "@/components/account-selector";
import { AssetSelector } from "@/components/asset-selector";
import { ContractDisplay } from "@/components/contract-display";
import { ThemeToggle } from "@/components/theme-toggle";
import { type Contract, PRESET_ACCOUNTS } from "@/types";
import { Footer } from "@dreadnought/ui";
import { Github, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [accountId, setAccountId] = useState<string>(PRESET_ACCOUNTS[0].id);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedAssetCode, setSelectedAssetCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch contracts when account changes
  useEffect(() => {
    if (!accountId || accountId.length !== 56 || !accountId.startsWith("G")) {
      setContracts([]);
      setSelectedAssetCode(null);
      return;
    }

    const fetchContracts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/contracts/${accountId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load contracts");
        }

        setContracts(data.contracts);
        setSelectedAssetCode(data.contracts[0]?.assetCode || null);
      } catch (err) {
        console.error("Failed to fetch contracts:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load contracts from account",
        );
        setContracts([]);
        setSelectedAssetCode(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchContracts();
  }, [accountId]);

  const selectedContract = contracts.find((c) => c.assetCode === selectedAssetCode);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-border bg-card">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary uppercase">
            PACT
          </h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Account Selector */}
          <div className="border-2 border-border bg-card p-6">
            <h2 className="text-xl font-bold text-primary uppercase mb-4">
              Account Selection
            </h2>
            <AccountSelector value={accountId} onChange={setAccountId} />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="border-2 border-border bg-card p-12 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="text-sm font-mono text-muted-foreground uppercase">
                  Loading contracts...
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="border-2 border-destructive bg-card p-6">
              <div className="text-destructive font-mono text-sm uppercase mb-2">
                Error
              </div>
              <div className="text-foreground font-mono text-sm">{error}</div>
            </div>
          )}

          {/* Asset Selector */}
          {!loading && !error && contracts.length > 0 && (
            <div className="border-2 border-border bg-card p-6">
              <AssetSelector
                contracts={contracts}
                selectedAssetCode={selectedAssetCode}
                onChange={setSelectedAssetCode}
              />
            </div>
          )}

          {/* Contract Display */}
          {!loading && !error && selectedContract && (
            <ContractDisplay contract={selectedContract} />
          )}

          {/* No Contracts */}
          {!loading && !error && contracts.length === 0 && accountId && (
            <div className="border-2 border-border bg-card p-12">
              <div className="text-center text-muted-foreground font-mono text-sm uppercase">
                No contracts found for this account
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer
        title="PACT"
        description="Stellar Contract Viewer"
        sections={[
          {
            title: "Links",
            links: [
              {
                href: "https://github.com/mtlprog/dreadnought",
                label: "GitHub",
                icon: Github,
                external: true,
              },
            ],
          },
        ]}
        bottomText="Built by Montelibero Programmers Guild"
      />
    </div>
  );
}
