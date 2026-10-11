import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  retryStorageWrites,
  storageFailures,
  subscribeStorageFailures,
} from "@/lib/storage-status";

export function StorageWriteNotice() {
  const failures = useSyncExternalStore(subscribeStorageFailures, storageFailures, storageFailures);
  const [retrying, setRetrying] = useState(false);
  if (failures.length === 0) return null;
  const blocked = failures.some((failure) => !failure.retry);

  async function retry() {
    setRetrying(true);
    try {
      await retryStorageWrites();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div
      role="alert"
      className="
        glass text-ink fixed top-20 right-4 z-toast flex max-w-sm items-center gap-3 rounded-2xl p-3
        shadow-elev-2
      "
    >
      <p className="text-caption min-w-0 flex-1">
        {blocked
          ? "Saved settings couldn’t be read. Reload Lux to try again."
          : "Your changes couldn’t be saved. Keep this tab open and retry saving."}
      </p>
      <Button
        variant="outline"
        size="xs"
        disabled={retrying}
        onClick={blocked ? () => location.reload() : () => void retry()}
      >
        {blocked ? "Reload" : retrying ? "Retrying…" : "Retry saving"}
      </Button>
    </div>
  );
}
