"use client";

import { scoreIndicator } from "@/lib/fuzzy";
import type { Indicator } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { LayoutGrid, List, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { IndicatorCard, IndicatorRow, IndicatorRowHeader } from "./indicator-card";

type ViewMode = "list" | "cards";
type Scope = "key" | "all";

interface IndicatorsGridProps {
  data: readonly Indicator[];
  keyIds: readonly number[];
  isLoading: boolean;
  error: string | null;
}

export function IndicatorsGrid({ data, keyIds, isLoading, error }: IndicatorsGridProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [view, setView] = useState<ViewMode>("list");
  const [scope, setScope] = useState<Scope>("key");

  const scoped = useMemo(() => {
    if (scope === "all") return data;
    const allowed = new Set(keyIds);
    return data.filter((indicator) => allowed.has(indicator.id));
  }, [data, keyIds, scope]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    if (q === "") return scoped;
    return scoped
      .map((indicator) => ({ indicator, score: scoreIndicator(q, indicator) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.indicator);
  }, [scoped, deferredQuery]);

  const state: "error" | "loading" | "empty" | "empty-key" | "no-matches" | "ready" = error !== null
    ? "error"
    : isLoading
    ? "loading"
    : data.length === 0
    ? "empty"
    : scoped.length === 0
    ? "empty-key"
    : filtered.length === 0
    ? "no-matches"
    : "ready";

  return (
    <section className="border border-cyber-green bg-background p-6 min-h-[640px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-xl uppercase tracking-wider text-cyber-green">
          FUND INDICATORS
        </h2>
        <div className="flex items-center gap-3">
          {state === "ready" && (
            <span className="font-mono text-xs uppercase text-steel-gray">
              {filtered.length}
              {query !== "" && filtered.length !== scoped.length ? ` / ${scoped.length}` : ""} INDICATORS
            </span>
          )}
          <ScopeToggle value={scope} onChange={setScope} />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 border border-steel-gray/40 bg-card px-3 py-2 focus-within:border-electric-cyan transition-colors">
        <Search className="h-3.5 w-3.5 text-steel-gray" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH BY ID (E.G. I30), NAME OR DESCRIPTION"
          className="flex-1 bg-transparent font-mono text-xs uppercase tracking-wider text-foreground placeholder:text-steel-gray focus:outline-none"
          aria-label="Search indicators"
        />
        {query !== "" && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="font-mono text-[10px] uppercase tracking-wider text-steel-gray hover:text-cyber-green transition-colors"
          >
            CLEAR
          </button>
        )}
      </div>

      {state === "error" && (
        <div className="border border-red-500 bg-red-500/10 p-4 font-mono text-sm text-red-400">
          ERROR: {error}
        </div>
      )}

      {state === "loading" && (
        <>
          {view === "list" && <IndicatorRowHeader />}
          <IndicatorListLayout view={view}>
            {Array.from({ length: view === "cards" ? 8 : 6 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "border border-steel-gray/30 bg-steel-gray/10 animate-pulse",
                  view === "cards" ? "h-44" : "h-10",
                )}
              />
            ))}
          </IndicatorListLayout>
        </>
      )}

      {state === "empty" && (
        <EmptyState>INDICATORS NOT YET COMPUTED</EmptyState>
      )}

      {state === "empty-key" && (
        <EmptyState>NO KEY INDICATORS AVAILABLE</EmptyState>
      )}

      {state === "no-matches" && (
        <EmptyState>NO MATCHES FOR &quot;{query}&quot;</EmptyState>
      )}

      {state === "ready" && (
        <>
          {view === "list" && <IndicatorRowHeader />}
          <IndicatorListLayout view={view}>
            {filtered.map((indicator) =>
              view === "cards"
                ? <IndicatorCard key={indicator.id} indicator={indicator} />
                : <IndicatorRow key={indicator.id} indicator={indicator} />
            )}
          </IndicatorListLayout>
        </>
      )}
    </section>
  );
}

function IndicatorListLayout({ view, children }: { view: ViewMode; children: React.ReactNode }) {
  return (
    <div
      className={view === "cards"
        ? "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        : "space-y-1.5"}
    >
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-steel-gray/40 bg-steel-gray/10 p-8 text-center font-mono text-sm uppercase tracking-wider text-steel-gray">
      {children}
    </div>
  );
}

function ScopeToggle({ value, onChange }: { value: Scope; onChange: (v: Scope) => void }) {
  return (
    <div
      role="group"
      aria-label="Indicator scope"
      className="inline-flex border border-electric-cyan bg-background"
    >
      <ToggleButton
        active={value === "key"}
        onClick={() => onChange("key")}
        label="KEY"
      />
      <ToggleButton
        active={value === "all"}
        onClick={() => onChange("all")}
        label="ALL"
        bordered
      />
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className="inline-flex border border-electric-cyan bg-background"
    >
      <ToggleButton
        active={value === "list"}
        onClick={() => onChange("list")}
        label="LIST"
        icon={<List className="h-3.5 w-3.5" aria-hidden />}
      />
      <ToggleButton
        active={value === "cards"}
        onClick={() => onChange("cards")}
        label="CARDS"
        icon={<LayoutGrid className="h-3.5 w-3.5" aria-hidden />}
        bordered
      />
    </div>
  );
}

function ToggleButton(
  { active, onClick, label, icon, bordered = false }: {
    active: boolean;
    onClick: () => void;
    label: string;
    icon?: React.ReactNode;
    bordered?: boolean;
  },
) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-green",
        bordered && "border-l border-electric-cyan",
        active
          ? "bg-electric-cyan text-background"
          : "text-electric-cyan hover:bg-electric-cyan/10",
      )}
    >
      {icon}
      {icon ? <span className="hidden sm:inline">{label}</span> : label}
    </button>
  );
}
