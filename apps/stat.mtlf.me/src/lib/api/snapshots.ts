import type { FundAccountPortfolio } from "@/lib/stellar/fund-structure-service";
import { apiGet, type ApiGetOptions, ApiShapeError } from "./client";
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

type FundAccountPortfolioRaw =
  & Omit<
    FundAccountPortfolio,
    "totalEURMTL" | "totalXLM"
  >
  & {
    readonly totalEURMTL: number | string;
    readonly totalXLM: number | string;
  };

const SNAPSHOT_PATH = "/api/v1/snapshots";

const parseRequiredNumber = (
  value: number | string | null | undefined,
  fieldName: string,
  path: string,
): number => {
  if (value === null || value === undefined) {
    throw new ApiShapeError(path, `missing required numeric field: ${fieldName}`);
  }
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n)) {
    throw new ApiShapeError(path, `non-finite value for ${fieldName}: ${String(value)}`);
  }
  return n;
};

const normalizeAccount = (
  raw: FundAccountPortfolioRaw,
  path: string,
  index: number,
): FundAccountPortfolio => ({
  ...raw,
  totalEURMTL: parseRequiredNumber(raw.totalEURMTL, `accounts[${index}].totalEURMTL`, path),
  totalXLM: parseRequiredNumber(raw.totalXLM, `accounts[${index}].totalXLM`, path),
});

const normalizeAggregated = (
  raw: AggregatedTotalsRaw | undefined,
  path: string,
): AggregatedTotals | null => {
  if (raw === undefined) return null;
  return {
    totalEURMTL: parseRequiredNumber(raw.totalEURMTL, "aggregatedTotals.totalEURMTL", path),
    totalXLM: parseRequiredNumber(raw.totalXLM, "aggregatedTotals.totalXLM", path),
    accountCount: raw.accountCount ?? 0,
    tokenCount: raw.tokenCount ?? 0,
  };
};

const adaptSnapshot = (envelope: SnapshotEnvelope, path: string): FundSnapshotView => {
  if (envelope.data === null || envelope.data === undefined || typeof envelope.data !== "object") {
    throw new ApiShapeError(path, "envelope.data missing or not an object");
  }
  const accounts = (envelope.data.accounts ?? []).map((raw, i) => normalizeAccount(raw, path, i));
  const otherAccountsRaw = envelope.data.otherAccounts ?? envelope.otherAccounts ?? [];
  const otherAccounts = otherAccountsRaw.map((raw, i) => normalizeAccount(raw, path, i));
  const aggregatedTotals = normalizeAggregated(envelope.data.aggregatedTotals, path);

  return { accounts, otherAccounts, aggregatedTotals };
};

export async function fetchLatestSnapshot(options?: ApiGetOptions): Promise<FundSnapshotView> {
  const path = `${SNAPSHOT_PATH}/latest`;
  const envelope = await apiGet<SnapshotEnvelope>(path, options);
  return adaptSnapshot(envelope, path);
}

export async function fetchSnapshotByDate(
  date: string,
  options?: ApiGetOptions,
): Promise<FundSnapshotView> {
  const path = `${SNAPSHOT_PATH}/${encodeURIComponent(date)}`;
  const envelope = await apiGet<SnapshotEnvelope>(path, options);
  return adaptSnapshot(envelope, path);
}

export async function fetchSnapshotList(
  limit = 365,
  options?: ApiGetOptions,
): Promise<SnapshotSummary[]> {
  const items = await apiGet<SnapshotSummary[]>(`${SNAPSHOT_PATH}?limit=${limit}`, options);
  return items.map((item) => ({
    id: item.id,
    entityId: item.entityId,
    snapshotDate: item.snapshotDate,
  }));
}

export const __test__ = { adaptSnapshot, parseRequiredNumber };
