import { fetchLatestSnapshot, fetchSnapshotByDate, type FundSnapshotView } from "@/lib/api/snapshots";
import { useApiResource } from "./use-api-resource";

interface UseFundDataState {
  data: FundSnapshotView | null;
  isLoading: boolean;
  error: string | null;
}

export function useFundData(selectedDate?: string | null): UseFundDataState {
  const dateParam = selectedDate?.split("T")[0];
  const dateKey = dateParam !== undefined && dateParam !== "" ? dateParam : null;

  return useApiResource(
    "useFundData",
    (options) => (dateKey === null ? fetchLatestSnapshot(options) : fetchSnapshotByDate(dateKey, options)),
    [dateKey],
  );
}
