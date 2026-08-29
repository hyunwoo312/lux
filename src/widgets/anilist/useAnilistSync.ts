import { createWidgetSync } from "@/widgets/core/useWidgetSync";
import { ANILIST_SYNC_KEY, useAnilistStore } from "@/widgets/anilist/useAnilistStore";

export const { useSync: useAnilistSync, useSyncStatus: useAnilistSyncStatus } = createWidgetSync(
  useAnilistStore,
  () => ANILIST_SYNC_KEY,
);
