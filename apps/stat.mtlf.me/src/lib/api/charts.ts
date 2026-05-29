import { apiGet, type ApiGetOptions } from "./client";
import type { BalanceBySubfund } from "./types";

export function fetchBalanceBySubfund(date?: string | null, options?: ApiGetOptions): Promise<BalanceBySubfund> {
  const path = date != null ? `/api/v1/charts/balance-by-subfund?date=${encodeURIComponent(date)}` : "/api/v1/charts/balance-by-subfund";
  return apiGet<BalanceBySubfund>(path, options);
}
