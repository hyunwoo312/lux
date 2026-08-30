import { usePagedDefinition } from "@/widgets/core/usePagedResource";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import { anilistActivity, anilistUnread } from "@/widgets/anilist/lib/resources";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";

export function useActivityUnseenCount(enabled: boolean, viewerId: number): number {
  const lang = useAnilist((d) => d.titleLanguage);
  const lastSeen = useAnilistStore((s) => s.lastSeenActivityAt ?? 0);

  const activity = usePagedDefinition(anilistActivity(viewerId, lang), { enabled });

  if (activity.state.status !== "success") return 0;
  return activity.state.items.filter((item) => item.createdAt > lastSeen).length;
}

export type UnreadSignal = { count: number; refresh: () => void; lastSyncedAt: number };

export function useUnreadCount(enabled: boolean, viewerId: number): UnreadSignal {
  const unread = usePolledDefinition(anilistUnread(viewerId), { enabled });
  return {
    count: unread.state.status === "success" ? unread.state.data : 0,
    refresh: unread.refresh,
    lastSyncedAt: unread.lastSyncedAt,
  };
}
