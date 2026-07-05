import { usePagedResource } from "@/widgets/core/usePagedResource";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchActivityPage,
  fetchUnreadCount,
  parseCachedActivity,
} from "@/widgets/anilist/lib/anilist-api";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { ANILIST_MAX_ITEMS } from "@/widgets/anilist/types";

const REFRESH_MS = 3 * 60 * 1000;

export type AnilistSignals = { activityNew: number; inboxUnread: number };

export function useAnilistSignals(enabled: boolean, viewerId: number): AnilistSignals {
  const lang = useAnilist((d) => d.titleLanguage);
  const lastSeen = useAnilistStore((s) => s.lastSeenActivityAt ?? 0);

  const activity = usePagedResource((page, signal) => fetchActivityPage(page, lang, signal), {
    enabled,
    intervalMs: REFRESH_MS,
    maxItems: ANILIST_MAX_ITEMS,
    cacheKey: anilistKeys.activity(viewerId, lang),
    getKey: (item) => item.id,
    persist: true,
    parsePersisted: parseCachedActivity,
  });
  const unread = usePolledResource(fetchUnreadCount, {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: anilistKeys.unread(viewerId),
    persist: true,
    parsePersisted: (raw) => (typeof raw === "number" ? raw : null),
  });

  const activityItems = activity.state.status === "success" ? activity.state.items : [];
  return {
    activityNew: activityItems.filter((item) => item.createdAt > lastSeen).length,
    inboxUnread: unread.state.status === "success" ? unread.state.data : 0,
  };
}
