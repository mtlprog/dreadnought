"use client";

import { FundStructureLoading } from "@/components/ui/loading-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFundData } from "@/hooks/use-fund-data";
import { useSnapshots } from "@/hooks/use-snapshots";
import {
  EXPLORERS,
  LORE_MTLPROG,
  loadExplorer,
  saveExplorer,
} from "@/lib/blockchain-explorer";
import { useEffect, useState } from "react";
import { FundStructureTable } from "./fund-structure-table";

export function PortfolioDemo() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [explorer, setExplorer] = useState(LORE_MTLPROG);
  const { snapshots, isLoading: snapshotsLoading, error: snapshotsError } = useSnapshots();
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
      <div className="mb-8 grid grid-cols-[auto_1fr] sm:grid-cols-[auto_auto_auto_auto] items-center gap-x-4 gap-y-3 sm:justify-end">
        <label className="font-mono text-sm uppercase tracking-wider text-steel-gray whitespace-nowrap">
          EXPLORER:
        </label>
        <Select value={explorer.id} onValueChange={handleExplorerChange}>
          <SelectTrigger className="w-full sm:w-[200px] border-electric-cyan bg-background font-mono text-sm uppercase">
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

        <label className="font-mono text-sm uppercase tracking-wider text-steel-gray whitespace-nowrap">
          SNAPSHOT:
        </label>
        <Select
          value={selectedDate ?? "latest"}
          onValueChange={(value) => setSelectedDate(value === "latest" ? null : value)}
          disabled={snapshotsLoading}
        >
          <SelectTrigger className="w-full sm:w-[260px] border-electric-cyan bg-background font-mono text-sm uppercase">
            <SelectValue placeholder="LOADING..." />
          </SelectTrigger>
          <SelectContent className="max-h-[400px] border-electric-cyan bg-background">
            <SelectItem
              value="latest"
              className="font-mono text-sm uppercase cursor-pointer hover:bg-electric-cyan/20"
            >
              LATEST SNAPSHOT
            </SelectItem>
            {snapshots.map((snapshot) => (
              <SelectItem
                key={snapshot.date}
                value={snapshot.date}
                className="font-mono text-sm cursor-pointer hover:bg-steel-gray/20"
              >
                {new Date(snapshot.date).toLocaleDateString("ru-RU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(error ?? snapshotsError) != null && (
        <div className="border border-red-500 bg-red-500/10 p-6">
          <h2 className="font-mono text-red-500 uppercase tracking-wider text-xl mb-2">
            ОШИБКА ЗАГРУЗКИ
          </h2>
          <p className="font-mono text-red-400">{error ?? snapshotsError}</p>
        </div>
      )}

      {isLoading && <FundStructureLoading accountCount={8} />}

      {fundData != null && <FundStructureTable fundData={fundData} explorer={explorer} isLoading={false} />}
    </div>
  );
}
