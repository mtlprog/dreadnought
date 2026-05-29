import { apiGet, type ApiGetOptions, ApiNotFoundError } from "./client";
import { logWarn } from "./log";
import type { Indicator, IndicatorHistory, Range } from "./types";

const COMPARE_PERIODS: readonly Range[] = ["30d", "90d", "365d"];
const COMPARE_QUERY = `compare=${COMPARE_PERIODS.join(",")}`;

export async function fetchIndicators(options?: ApiGetOptions): Promise<Indicator[]> {
  const path = `/api/v1/indicators?${COMPARE_QUERY}`;
  try {
    return await apiGet<Indicator[]>(path, options);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      logWarn("api.indicators", `404 from ${error.path} — treating as empty list`);
      return [];
    }
    throw error;
  }
}

export function fetchIndicatorsByDate(date: string, options?: ApiGetOptions): Promise<Indicator[]> {
  const path = `/api/v1/indicators/${encodeURIComponent(date)}?${COMPARE_QUERY}`;
  return apiGet<Indicator[]>(path, options);
}

export function fetchIndicatorHistory(
  ids: readonly number[],
  range: Range,
  options?: ApiGetOptions,
): Promise<IndicatorHistory> {
  return apiGet<IndicatorHistory>(
    `/api/v1/charts/indicator-history?ids=${ids.join(",")}&range=${range}`,
    options,
  );
}
