import { fetchSnapshotList } from "@/lib/api/snapshots";
import { useApiResource } from "./use-api-resource";

export interface Snapshot {
  date: string;
}

interface UseSnapshotsState {
  snapshots: Snapshot[];
  isLoading: boolean;
  error: string | null;
}

const toDateKey = (iso: string): string => iso.split("T")[0] ?? iso;

export function useSnapshots(): UseSnapshotsState {
  const { data, isLoading, error } = useApiResource(
    "useSnapshots",
    (options) => fetchSnapshotList(365, options),
    [],
  );
  const snapshots = data !== null ? data.map((item) => ({ date: toDateKey(item.snapshotDate) })) : [];
  return { snapshots, isLoading, error };
}
