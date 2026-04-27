import type { FundAccountPortfolio } from "@/lib/stellar/fund-structure-service";
import { apiGet } from "./client";
import type { SnapshotSummary } from "./types";

export interface AggregatedTotals {
  readonly totalEURMTL: number;
  readonly totalXLM: number;
  readonly accountCount: number;
  readonly tokenCount: number;
}

export interface FundSnapshotView {
  readonly accounts: readonly FundAccountPortfolio[];
  readonly otherAccounts: readonly FundAccountPortfolio[];
  readonly aggregatedTotals: AggregatedTotals | null;
}

interface SnapshotEnvelope {
  readonly id: number;
  readonly entityId: number;
  readonly snapshotDate: string;
  readonly data: FundStructureRaw;
  readonly otherAccounts?: readonly FundAccountPortfolioRaw[];
}

interface FundStructureRaw {
  readonly accounts?: readonly FundAccountPortfolioRaw[];
  readonly otherAccounts?: readonly FundAccountPortfolioRaw[];
  readonly aggregatedTotals?: AggregatedTotalsRaw;
}

interface AggregatedTotalsRaw {
  readonly totalEURMTL?: number | string;
  readonly totalXLM?: number | string;
  readonly accountCount?: number;
  readonly tokenCount?: number;
}

type FundAccountPortfolioRaw = Omit<
  FundAccountPortfolio,
  "totalEURMTL" | "totalXLM"
> & {
  readonly totalEURMTL: number | string;
  readonly totalXLM: number | string;
};

const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeAccount = (raw: FundAccountPortfolioRaw): FundAccountPortfolio => ({
  ...raw,
  totalEURMTL: toNumber(raw.totalEURMTL),
  totalXLM: toNumber(raw.totalXLM),
});

const normalizeAggregated = (
  raw: AggregatedTotalsRaw | undefined,
): AggregatedTotals | null => {
  if (raw === undefined) return null;
  return {
    totalEURMTL: toNumber(raw.totalEURMTL),
    totalXLM: toNumber(raw.totalXLM),
    accountCount: raw.accountCount ?? 0,
    tokenCount: raw.tokenCount ?? 0,
  };
};

const adaptSnapshot = (envelope: SnapshotEnvelope): FundSnapshotView => {
  const accounts = (envelope.data.accounts ?? []).map(normalizeAccount);
  const otherAccountsRaw =
    envelope.data.otherAccounts ?? envelope.otherAccounts ?? [];
  const otherAccounts = otherAccountsRaw.map(normalizeAccount);
  const aggregatedTotals = normalizeAggregated(envelope.data.aggregatedTotals);

  return { accounts, otherAccounts, aggregatedTotals };
};

export async function fetchLatestSnapshot(): Promise<FundSnapshotView> {
  const envelope = await apiGet<SnapshotEnvelope>("/api/v1/snapshots/latest");
  return adaptSnapshot(envelope);
}

export async function fetchSnapshotByDate(
  date: string,
): Promise<FundSnapshotView> {
  const envelope = await apiGet<SnapshotEnvelope>(
    `/api/v1/snapshots/${encodeURIComponent(date)}`,
  );
  return adaptSnapshot(envelope);
}

interface SnapshotListItem {
  readonly id: number;
  readonly entityId: number;
  readonly snapshotDate: string;
}

export async function fetchSnapshotList(
  limit = 365,
): Promise<SnapshotSummary[]> {
  const items = await apiGet<SnapshotListItem[]>(
    `/api/v1/snapshots?limit=${limit}`,
  );
  return items.map((item) => ({
    id: item.id,
    entityId: item.entityId,
    snapshotDate: item.snapshotDate,
  }));
}
