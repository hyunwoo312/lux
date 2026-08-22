import { usePagedResource } from "@/widgets/core/usePagedResource";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchActivityPage, fetchUnreadCount } from "@/widgets/anilist/lib/api/feed";
import { parseCachedActivity } from "@/widgets/anilist/lib/api/cache";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import {
  ACTIVITY_REFRESH_MS,
  ANILIST_MAX_ITEMS,
  ANILIST_REFRESH_MS,
} from "@/widgets/anilist/types";

export function useActivityUnseenCount(enabled: boolean, viewerId: number): number {
  const lang = useAnilist((d) => d.titleLanguage);
  const lastSeen = useAnilistStore((s) => s.lastSeenActivityAt ?? 0);

  const activity = usePagedResource((page, signal) => fetchActivityPage(page, lang, signal), {
    enabled,
    intervalMs: ACTIVITY_REFRESH_MS,
    maxItems: ANILIST_MAX_ITEMS,
    cacheKey: anilistKeys.activity(viewerId, lang),
    getKey: (item) => item.id,
    persist: true,
    parsePersisted: parseCachedActivity,
  });

  if (activity.state.status !== "success") return 0;
  return activity.state.items.filter((item) => item.createdAt > lastSeen).length;
}

export type UnreadSignal = { count: number; refresh: () => void };

export function useUnreadCount(enabled: boolean, viewerId: number): UnreadSignal {
  const unread = usePolledResource(fetchUnreadCount, {
    enabled,
    intervalMs: ANILIST_REFRESH_MS,
    cacheKey: anilistKeys.unread(viewerId),
    persist: true,
    parsePersisted: (raw) => (typeof raw === "number" ? raw : null),
  });
  return {
    count: unread.state.status === "success" ? unread.state.data : 0,
    refresh: unread.refresh,
  };
}
