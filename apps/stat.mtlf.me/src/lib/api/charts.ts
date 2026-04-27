import { apiGet, type ApiGetOptions } from "./client";
import type { BalanceBySubfund } from "./types";

export function fetchBalanceBySubfund(options?: ApiGetOptions): Promise<BalanceBySubfund> {
  return apiGet<BalanceBySubfund>("/api/v1/charts/balance-by-subfund", options);
}
