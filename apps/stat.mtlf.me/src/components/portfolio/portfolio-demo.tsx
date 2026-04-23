"use client";

import { FundStructureLoading } from "@/components/ui/loading-skeleton";
import { useFundData } from "@/hooks/use-fund-data";
import { useSnapshots } from "@/hooks/use-snapshots";
import { API_ENDPOINTS, LOCAL_SENTINEL, loadEndpoint, saveEndpoint } from "@/lib/api-endpoints";
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
  const [baseUrl, setBaseUrl] = useState(loadEndpoint);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { snapshots, isLoading: snapshotsLoading, error: snapshotsError } = useSnapshots(baseUrl);
  const { data: fundData, isLoading, error } = useFundData(selectedDate, baseUrl);

  const handleEndpointChange = (value: string) => {
    const url = value === LOCAL_SENTINEL ? "" : value;
    setBaseUrl(url);
    saveEndpoint(url);
    setSelectedDate(null);
  };

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Endpoint and snapshot selectors */}
      <div className="mb-8 flex items-center justify-end gap-4 flex-wrap">
        <label className="font-mono text-sm uppercase tracking-wider text-steel-gray">
          ИСТОЧНИК:
        </label>
        <Select value={baseUrl || LOCAL_SENTINEL} onValueChange={handleEndpointChange}>
          <SelectTrigger className="w-[220px] border-electric-cyan bg-background font-mono text-sm uppercase">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-electric-cyan bg-background">
            {API_ENDPOINTS.map((ep) => (
              <SelectItem
                key={ep.label}
                value={ep.value || LOCAL_SENTINEL}
                className="font-mono text-sm uppercase cursor-pointer hover:bg-electric-cyan/20"
              >
                {ep.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="font-mono text-sm uppercase tracking-wider text-steel-gray">
          SNAPSHOT:
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

      {(error ?? snapshotsError) != null && (
        <div className="border border-red-500 bg-red-500/10 p-6">
          <h2 className="font-mono text-red-500 uppercase tracking-wider text-xl mb-2">
            ОШИБКА ЗАГРУЗКИ
          </h2>
          <p className="font-mono text-red-400">{error ?? snapshotsError}</p>
        </div>
      )}

      {isLoading && <FundStructureLoading accountCount={8} />}

      {fundData != null && <FundStructureTable fundData={fundData} isLoading={false} />}
    </div>
  );
}
