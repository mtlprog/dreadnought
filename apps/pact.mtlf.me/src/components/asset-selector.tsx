"use client";

import { Label } from "@dreadnought/ui";
import type { Contract } from "@/types";

interface AssetSelectorProps {
  contracts: Contract[];
  selectedAssetCode: string | null;
  onChange: (assetCode: string) => void;
}

export function AssetSelector({
  contracts,
  selectedAssetCode,
  onChange,
}: AssetSelectorProps) {
  if (contracts.length === 0) {
    return null;
  }

  if (contracts.length === 1) {
    const contract = contracts[0];
    if (!contract) return null;

    return (
      <div className="border-2 border-border bg-card p-4">
        <div className="text-sm font-mono text-muted-foreground uppercase">
          Contract Asset
        </div>
        <div className="text-xl font-bold text-primary uppercase mt-2">
          {contract.assetCode} - {contract.metadata.name}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="asset-selector" className="text-sm font-mono uppercase mb-2 block">
        Select Contract
      </Label>
      <select
        id="asset-selector"
        value={selectedAssetCode || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 border-border bg-background text-foreground p-3 font-mono text-sm uppercase focus:outline-none focus:border-primary"
      >
        {contracts.map((contract) => (
          <option key={contract.assetCode} value={contract.assetCode}>
            {contract.assetCode} - {contract.metadata.name}
          </option>
        ))}
      </select>
    </div>
  );
}
