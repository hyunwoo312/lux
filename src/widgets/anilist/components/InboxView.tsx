import { ROW } from "@/lib/row";
import { Bell, Inbox } from "lucide-react";
import { ErrorState, StateMessage } from "@/components/StateMessage";
import { formatRelativeTime } from "@/lib/relative-time";
import { usePagedResource } from "@/widgets/core/usePagedResource";
import { fetchInboxPage } from "@/widgets/anilist/lib/api/feed";
import { parseCachedInbox } from "@/widgets/anilist/lib/api/cache";
import { FeedList } from "@/widgets/anilist/components/FeedList";
import { FeedThumb } from "@/widgets/anilist/components/FeedThumb";
import { AnilistSkeleton } from "@/widgets/anilist/components/AnilistSkeleton";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { useAnilistSync } from "@/widgets/anilist/useAnilistSync";
import { useAnilist } from "@/widgets/anilist/useAnilistStore";
import {
  ANILIST_MAX_ITEMS,
  ANILIST_REFRESH_MS,
  type AnilistNotification,
} from "@/widgets/anilist/types";

export function InboxView({
  enabled,
  userId,
  newTab,
  unreadCount,
}: {
  enabled: boolean;
  userId: number;
  newTab: boolean;
  unreadCount: number;
}) {
  const lang = useAnilist((d) => d.titleLanguage);
  const { state, hasMore, isLoadingMore, isRefreshing, loadMore, refresh, lastSyncedAt } =
    usePagedResource((page, signal) => fetchInboxPage(page, lang, signal), {
      enabled,
      intervalMs: ANILIST_REFRESH_MS,
      maxItems: ANILIST_MAX_ITEMS,
      cacheKey: anilistKeys.inbox(userId, lang),
      getKey: (notification) => notification.id,
      persist: true,
      parsePersisted: parseCachedInbox,
    });
  useAnilistSync(refresh, isRefreshing, lastSyncedAt);

  if (state.status === "loading") return <AnilistSkeleton variant="list" label="Loading inbox…" />;
  if (state.status === "error")
    return (
      <ErrorState
        error={state.error}
        service="AniList"
        subject="your inbox"
        onRetry={refresh}
        retrying={isRefreshing}
      />
    );
  if (state.status === "empty")
    return <StateMessage icon={Inbox} message="Inbox zero — nothing waiting." />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FeedList
        label="Notifications"
        items={state.items}
        getKey={(notification) => notification.id}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        loadMore={loadMore}
        renderItem={(notification, index) => (
          <NotificationRow
            notification={notification}
            newTab={newTab}
            isUnread={index < unreadCount}
          />
        )}
      />
    </div>
  );
}

function NotificationRow({
  notification,
  newTab,
  isUnread,
}: {
  notification: AnilistNotification;
  newTab: boolean;
  isUnread: boolean;
}) {
  const className = notification.url ? ROW.itemAction : ROW.item;
  const body = (
    <>
      <FeedThumb
        variant={notification.imageKind === "avatar" ? "avatar" : "cover"}
        src={notification.imageUrl}
        title={notification.text}
        fallback={<Bell className="size-4" aria-hidden />}
      />
      <div className="min-w-0 flex-1">
        <p className="text-ink line-clamp-2 text-caption">{notification.text}</p>
        <p className="text-ink-3 text-micro flex items-center gap-1">
          {isUnread && <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden />}
          <span className="truncate">{formatRelativeTime(notification.createdAt)}</span>
        </p>
      </div>
    </>
  );

  if (!notification.url) {
    return <div className={className}>{body}</div>;
  }

  return (
    <a
      href={notification.url}
      target={newTab ? "_blank" : undefined}
      rel="noreferrer"
      className={className}
    >
      {body}
    </a>
  );
}
