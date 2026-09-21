import { useEffect, useState } from "react";
import { getQueueSnapshot, onQueueChange } from "./queue";

export function useOfflineQueue() {
  const [snapshot, setSnapshot] = useState({ pending: [], failed: [] });

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getQueueSnapshot().then((s) => {
        if (!cancelled) setSnapshot(s);
      });
    };
    refresh();
    const unsubscribe = onQueueChange(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    pendingCount: snapshot.pending.length,
    failedCount: snapshot.failed.length,
    pending: snapshot.pending,
    failed: snapshot.failed,
  };
}
