import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useFreshness } from "@/widgets/core/usePolledResource";
import { useEmailStore } from "@/widgets/email/useEmailStore";
import { useEmailSyncStatus } from "@/widgets/email/useEmailSync";
import { EMAIL_SYNC_COOLDOWN_MS } from "@/widgets/email/types";

export function EmailRefreshButton() {
  const freshness = useFreshness("email:");
  const status = useEmailSyncStatus();
  const requestSync = useEmailStore((s) => s.requestSync);

  return (
    <WidgetRefreshButton
      label="Mail"
      {...status}
      freshness={freshness}
      cooldownMs={EMAIL_SYNC_COOLDOWN_MS}
      onRefresh={requestSync}
    />
  );
}
