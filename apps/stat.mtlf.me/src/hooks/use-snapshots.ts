import { useEffect, useState } from "react";

export interface Snapshot {
  date: string;
  createdAt: string;
}

interface UseSnapshotsState {
  snapshots: Snapshot[];
  isLoading: boolean;
  error: string | null;
}

export function useSnapshots(): UseSnapshotsState {
  const [state, setState] = useState<UseSnapshotsState>({
    snapshots: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchSnapshots = async () => {
      try {
        setState({ snapshots: [], isLoading: true, error: null });

        const response = await fetch("/api/snapshots");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (mounted) {
          setState({ snapshots: data, isLoading: false, error: null });
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

    void fetchSnapshots();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
