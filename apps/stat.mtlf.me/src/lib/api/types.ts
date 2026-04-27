export const RANGES = ["30d", "90d", "180d", "365d", "all"] as const;
export type Range = typeof RANGES[number];

export type DecimalString = string & { readonly __brand: "DecimalString" };

export const isDecimalString = (value: unknown): value is DecimalString => {
  if (typeof value !== "string" || value === "") return false;
  return Number.isFinite(parseFloat(value));
};

export const decimalToNumber = (value: DecimalString): number => parseFloat(value);

export interface IndicatorChange {
  readonly abs: DecimalString;
  readonly pct: DecimalString;
}

export interface Indicator {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly unit: string;
  readonly value: DecimalString;
  readonly changes?: Partial<Record<Range, IndicatorChange>>;
}

export interface SubfundSlice {
  readonly name: string;
  readonly type: string;
  readonly address: string;
  readonly value: DecimalString;
}

export interface BalanceBySubfund {
  readonly date: string;
  readonly slices: readonly SubfundSlice[];
}

export interface IndicatorPoint {
  readonly date: string;
  readonly value: DecimalString;
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
