"use client";

import { AccountSelector } from "@/components/account-selector";
import { AssetSelector } from "@/components/asset-selector";
import { ContractDisplay } from "@/components/contract-display";
import { ThemeToggle } from "@/components/theme-toggle";
import { type Contract } from "@/types";
import { Footer } from "@dreadnought/ui";
import { Github, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ContractPage() {
  const params = useParams();
  const router = useRouter();
  const urlAccountId = params["accountId"] as string;
  const urlAssetCode = params["assetCode"] as string;

  // Local state for account and asset (for combobox without redirects)
  const [localAccountId, setLocalAccountId] = useState<string>(urlAccountId);
  const [localAssetCode, setLocalAssetCode] = useState<string | null>(urlAssetCode);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local state with URL on mount and URL changes
  useEffect(() => {
    setLocalAccountId(urlAccountId);
    setLocalAssetCode(urlAssetCode);
  }, [urlAccountId, urlAssetCode]);

  // Fetch contracts when local account changes
  useEffect(() => {
    if (!localAccountId || localAccountId.length !== 56 || !localAccountId.startsWith("G")) {
      setContracts([]);
      if (localAccountId && localAccountId.length > 0) {
        setError("Invalid account ID");
      } else {
        setError(null);
      }
      return;
    }

    const fetchContracts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/contracts/${localAccountId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load contracts");
        }

        setContracts(data.contracts);

        // Auto-select first asset if none selected or current doesn't exist
        const assetExists = data.contracts.some(
          (c: Contract) => c.assetCode === localAssetCode,
        );

        if (!assetExists && data.contracts.length > 0) {
          setLocalAssetCode(data.contracts[0].assetCode);
          // Update URL only after successful fetch
          router.replace(`/${localAccountId}/${data.contracts[0].assetCode}`);
        } else if (localAssetCode && localAccountId !== urlAccountId) {
          // Account changed, update URL
          router.replace(`/${localAccountId}/${localAssetCode}`);
        }
      } catch (err) {
        console.error("Failed to fetch contracts:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load contracts from account",
        );
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchContracts();
  }, [localAccountId, localAssetCode, router, urlAccountId]);

  const handleAccountChange = (newAccountId: string) => {
    // Just update local state, useEffect will handle fetch and URL update
    setLocalAccountId(newAccountId);
  };

  const handleAssetChange = (newAssetCode: string | null) => {
    if (newAssetCode && newAssetCode !== localAssetCode) {
      setLocalAssetCode(newAssetCode);
      // Update URL immediately for asset changes
      router.push(`/${localAccountId}/${newAssetCode}`);
    }
  };

  const selectedContract = contracts.find((c) => c.assetCode === localAssetCode);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-border bg-card">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary uppercase">PACT</h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Account Selector */}
          <div className="border-2 border-border bg-card p-6">
            <h2 className="text-xl font-bold text-primary uppercase mb-4">
              Account Selection
            </h2>
            <AccountSelector value={localAccountId} onChange={handleAccountChange} />
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
                selectedAssetCode={localAssetCode}
                onChange={handleAssetChange}
              />
            </div>
          )}

          {/* Contract Display */}
          {!loading && !error && selectedContract && (
            <ContractDisplay contract={selectedContract} />
          )}

          {/* No Contracts */}
          {!loading && !error && contracts.length === 0 && localAccountId && (
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
