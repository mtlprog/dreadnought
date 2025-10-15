"use client";

import { FundStructureLoading } from "@/components/ui/loading-skeleton";
import { useFundData } from "@/hooks/use-fund-data";
import { useSnapshots } from "@/hooks/use-snapshots";
import { FundStructureTable } from "./fund-structure-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export function PortfolioDemo() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { snapshots, isLoading: snapshotsLoading } = useSnapshots();
  const { data: fundData, isLoading, error } = useFundData(selectedDate);

  if (error != null) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="border border-red-500 bg-red-500/10 p-6">
          <h2 className="font-mono text-red-500 uppercase tracking-wider text-xl mb-2">
            ❌ ОШИБКА ЗАГРУЗКИ
          </h2>
          <p className="font-mono text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-500 text-white px-4 py-2 font-mono uppercase tracking-wider hover:bg-red-600 transition-colors"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  if (isLoading === true) {
    return (
      <div className="container mx-auto px-4 py-16">
        <FundStructureLoading accountCount={8} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Snapshot date selector */}
      <div className="mb-8 flex items-center justify-end gap-4">
        <label className="font-mono text-sm uppercase tracking-wider text-steel-gray">
          ВЫБРАТЬ SNAPSHOT:
        </label>
        <Select
          value={selectedDate ?? "latest"}
          onValueChange={(value) => setSelectedDate(value === "latest" ? null : value)}
          disabled={snapshotsLoading}
        >
          <SelectTrigger className="w-[280px] border-electric-cyan bg-background font-mono text-sm uppercase">
            <SelectValue placeholder="ЗАГРУЗКА..." />
          </SelectTrigger>
          <SelectContent className="max-h-[400px] border-electric-cyan bg-background">
            <SelectItem
              value="latest"
              className="font-mono text-sm uppercase cursor-pointer hover:bg-electric-cyan/20"
            >
              ↗ ПОСЛЕДНИЙ SNAPSHOT
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

      {fundData != null && <FundStructureTable fundData={fundData} isLoading={false} />}
    </div>
  );
}
