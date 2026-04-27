export const RANGES = ["30d", "90d", "180d", "365d", "all"] as const;
export type Range = typeof RANGES[number];

export interface IndicatorChange {
  readonly abs: string;
  readonly pct: string;
}

export interface Indicator {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly unit: string;
  readonly value: string;
  readonly changes?: Partial<Record<Range, IndicatorChange>>;
}

export interface SubfundSlice {
  readonly name: string;
  readonly type: string;
  readonly address: string;
  readonly value: string;
}

export interface BalanceBySubfund {
  readonly date: string;
  readonly slices: readonly SubfundSlice[];
}

export interface IndicatorPoint {
  readonly date: string;
  readonly value: string;
}

export interface IndicatorSeries {
  readonly id: number;
  readonly name: string;
  readonly unit: string;
  readonly points: readonly IndicatorPoint[];
}

export interface IndicatorHistory {
  readonly series: readonly IndicatorSeries[];
}

export interface SnapshotSummary {
  readonly id: number;
  readonly entityId: number;
  readonly snapshotDate: string;
}
