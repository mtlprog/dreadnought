"use client";

import { FundStructureLoading } from "@/components/ui/loading-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFundData } from "@/hooks/use-fund-data";
import { EXPLORERS, loadExplorer, LORE_MTLPROG, saveExplorer } from "@/lib/blockchain-explorer";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FundStructureTable } from "./fund-structure-table";

export function PortfolioDemo() {
  const searchParams = useSearchParams();
  const selectedDate = searchParams.get("date");
  const [explorer, setExplorer] = useState(LORE_MTLPROG);
  const { data: fundData, isLoading, error } = useFundData(selectedDate);

  useEffect(() => {
    setExplorer(loadExplorer());
  }, []);

  const handleExplorerChange = (explorerId: string) => {
    const selected = EXPLORERS.find((e) => e.id === explorerId);
    if (selected === undefined) return;
    setExplorer(selected);
    saveExplorer(explorerId);
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-8 flex items-center gap-x-4 justify-end">
        <label className="font-mono text-sm uppercase tracking-wider text-steel-gray whitespace-nowrap">
          EXPLORER:
        </label>
        <Select value={explorer.id} onValueChange={handleExplorerChange}>
          <SelectTrigger className="w-[200px] border-electric-cyan bg-background font-mono text-sm uppercase">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-electric-cyan bg-background">
            {EXPLORERS.map((e) => (
              <SelectItem
                key={e.id}
                value={e.id}
                className="font-mono text-sm uppercase cursor-pointer hover:bg-electric-cyan/20"
              >
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error != null && (
        <div className="border border-red-500 bg-red-500/10 p-6">
          <h2 className="font-mono text-red-500 uppercase tracking-wider text-xl mb-2">
            LOAD ERROR
          </h2>
          <p className="font-mono text-red-400">{error}</p>
        </div>
      )}

      {isLoading && <FundStructureLoading accountCount={8} />}

      {fundData != null && <FundStructureTable fundData={fundData} explorer={explorer} isLoading={false} />}
    </div>
  );
}
