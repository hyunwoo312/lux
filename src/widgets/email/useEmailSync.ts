import { createWidgetSync } from "@/widgets/core/useWidgetSync";
import { EMAIL_SYNC_KEY, useEmailStore } from "@/widgets/email/useEmailStore";

export const { useSync: useEmailSync, useSyncStatus: useEmailSyncStatus } = createWidgetSync(
  useEmailStore,
  () => EMAIL_SYNC_KEY,
);
