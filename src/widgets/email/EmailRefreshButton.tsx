import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useFreshness } from "@/widgets/core/usePolledResource";
import { useEmailStore } from "@/widgets/email/useEmailStore";
import { EMAIL_SYNC_COOLDOWN_MS } from "@/widgets/email/types";

export function EmailRefreshButton() {
  const freshness = useFreshness("email:");
  const syncing = useEmailStore((s) => s.syncing);
  const lastSyncAt = useEmailStore((s) => s.lastSyncAt);
  const dataSyncedAt = useEmailStore((s) => s.dataSyncedAt);
  const requestSync = useEmailStore((s) => s.requestSync);

  return (
    <WidgetRefreshButton
      label="Mail"
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      updatedAt={dataSyncedAt}
      freshness={freshness}
      cooldownMs={EMAIL_SYNC_COOLDOWN_MS}
      onRefresh={() => requestSync()}
    />
  );
}
