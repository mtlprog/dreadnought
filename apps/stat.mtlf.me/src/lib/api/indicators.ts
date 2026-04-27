import { ApiNotFoundError, apiGet } from "./client";
import type { Indicator, IndicatorHistory, Range } from "./types";

const COMPARE_PERIODS: readonly Range[] = ["30d", "90d", "365d"];

export async function fetchIndicators(): Promise<Indicator[]> {
  try {
    return await apiGet<Indicator[]>(
      `/api/v1/indicators?compare=${COMPARE_PERIODS.join(",")}`,
    );
  } catch (error) {
    if (error instanceof ApiNotFoundError) return [];
    throw error;
  }
}

export function fetchIndicatorHistory(
  ids: readonly number[],
  range: Range,
): Promise<IndicatorHistory> {
  return apiGet<IndicatorHistory>(
    `/api/v1/charts/indicator-history?ids=${ids.join(",")}&range=${range}`,
  );
}
