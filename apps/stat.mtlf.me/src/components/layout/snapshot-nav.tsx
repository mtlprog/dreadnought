"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSnapshots } from "@/hooks/use-snapshots";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).toUpperCase();

function SnapshotNavInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedDate = searchParams.get("date");
  const { snapshots, isLoading } = useSnapshots();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "latest") {
      params.delete("date");
    } else {
      params.set("date", value);
    }
    const qs = params.toString();
    router.push(qs.length > 0 ? `?${qs}` : "?", { scroll: false });
  };

  return (
    <Select
      value={selectedDate ?? "latest"}
      onValueChange={handleChange}
      disabled={isLoading}
    >
      <SelectTrigger className="h-12 w-[200px] rounded-none border-electric-cyan bg-background font-mono text-xs uppercase tracking-wider focus:ring-0 focus:ring-offset-0">
        <SelectValue placeholder="LOADING..." />
      </SelectTrigger>
      <SelectContent className="max-h-[400px] rounded-none border-electric-cyan bg-background">
        <SelectItem
          value="latest"
          className="rounded-none font-mono text-xs uppercase tracking-wider cursor-pointer focus:bg-electric-cyan/20"
        >
          LATEST
        </SelectItem>
        {snapshots.map((snapshot) => (
          <SelectItem
            key={snapshot.date}
            value={snapshot.date}
            className="rounded-none font-mono text-xs cursor-pointer focus:bg-steel-gray/20"
          >
            {formatDate(snapshot.date)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SnapshotNav() {
  return (
    <Suspense fallback={
      <div className="h-12 w-[200px] border border-electric-cyan/30 bg-background font-mono text-xs uppercase tracking-wider flex items-center px-3 text-steel-gray/50">
        LOADING...
      </div>
    }>
      <SnapshotNavInner />
    </Suspense>
  );
}
