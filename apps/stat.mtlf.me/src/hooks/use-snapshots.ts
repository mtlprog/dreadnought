import { fetchSnapshotList } from "@/lib/api/snapshots";
import { useEffect, useState } from "react";

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
  const [state, setState] = useState<UseSnapshotsState>({
    snapshots: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setState({ snapshots: [], isLoading: true, error: null });
        const items = await fetchSnapshotList(365);
        const snapshots = items.map((item) => ({ date: toDateKey(item.snapshotDate) }));

        if (mounted) {
          setState({ snapshots, isLoading: false, error: null });
        }
      } catch (error) {
        if (mounted) {
          setState({
            snapshots: [],
            isLoading: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
