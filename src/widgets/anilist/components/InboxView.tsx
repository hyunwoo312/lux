import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/relative-time";
import { Tooltip } from "@/components/ui/tooltip";
import { usePolledResource, invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { usePagedResource } from "@/widgets/core/usePagedResource";
import {
  fetchInboxPage,
  fetchUnreadCount,
  markAllNotificationsRead,
  parseCachedInbox,
} from "@/widgets/anilist/lib/anilist-api";
import { FeedList } from "@/widgets/anilist/components/FeedList";
import { FeedThumb } from "@/widgets/anilist/components/FeedThumb";
import { AnilistPlaceholder } from "@/widgets/anilist/components/AnilistPlaceholder";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { useAnilistSync } from "@/widgets/anilist/useAnilistSync";
import { useAnilist } from "@/widgets/anilist/useAnilistStore";
import { ANILIST_MAX_ITEMS, type AnilistNotification } from "@/widgets/anilist/types";

const REFRESH_MS = 3 * 60 * 1000;

export function InboxView({
  enabled,
  userId,
  newTab,
}: {
  enabled: boolean;
  userId: number;
  newTab: boolean;
}) {
  const lang = useAnilist((d) => d.titleLanguage);
  const unread = usePolledResource(fetchUnreadCount, {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: anilistKeys.unread(userId),
    persist: true,
    parsePersisted: (raw) => (typeof raw === "number" ? raw : null),
  });
  const unreadRefresh = unread.refresh;
  const { state, hasMore, isLoadingMore, isRefreshing, loadMore, refresh, lastSyncedAt } =
    usePagedResource(
    (page, signal) => fetchInboxPage(page, lang, signal),
    {
      enabled,
      intervalMs: REFRESH_MS,
      maxItems: ANILIST_MAX_ITEMS,
      cacheKey: anilistKeys.inbox(userId, lang),
      getKey: (notification) => notification.id,
      persist: true,
      parsePersisted: parseCachedInbox,
    },
  );
  const refreshAll = useCallback(() => {
    refresh();
    unreadRefresh();
  }, [refresh, unreadRefresh]);
  useAnilistSync(refreshAll, isRefreshing, lastSyncedAt);

  const [unreadOverride, setUnreadOverride] = useState<number | null>(null);
  const [marking, setMarking] = useState(false);
  const liveUnread = unread.state.status === "success" ? unread.state.data : 0;

  const markRead = useCallback(() => {
    setMarking(true);
    setUnreadOverride(0);
    markAllNotificationsRead().then(
      () => {
        setMarking(false);
        invalidatePolledResource(anilistKeys.unread(userId));
        unreadRefresh();
      },
      () => {
        setMarking(false);
        setUnreadOverride(null);
      },
    );
  }, [unreadRefresh, userId]);

  useEffect(() => {
    if (unreadOverride !== null && liveUnread === 0) setUnreadOverride(null);
  }, [unreadOverride, liveUnread]);

  if (state.status === "loading") return <AnilistPlaceholder>Loading inbox…</AnilistPlaceholder>;
  if (state.status === "error")
    return <AnilistPlaceholder>Couldn’t load your inbox.</AnilistPlaceholder>;
  if (state.status === "empty")
    return <AnilistPlaceholder>Inbox zero — nothing waiting.</AnilistPlaceholder>;

  const unreadCount = unreadOverride ?? liveUnread;

  return (
    <FeedList
      items={state.items}
      getKey={(notification) => notification.id}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      loadMore={loadMore}
      header={<InboxHeader unreadCount={unreadCount} marking={marking} onMarkRead={markRead} />}
      renderItem={(notification, index) => (
        <NotificationRow
          notification={notification}
          newTab={newTab}
          isUnread={index < unreadCount}
        />
      )}
    />
  );
}

function InboxHeader({
  unreadCount,
  marking,
  onMarkRead,
}: {
  unreadCount: number;
  marking: boolean;
  onMarkRead: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <span className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
        Notifications
      </span>
      {unreadCount > 0 && (
        <div className="flex items-center gap-1.5">
          <span
            className="
              bg-primary text-primary-foreground text-2xs rounded-full px-1.5 py-0.5 font-semibold
              tabular-nums
            "
          >
            {unreadCount} unread
          </span>
          <Tooltip content="Mark all read" solid>
            <button
              type="button"
              onClick={onMarkRead}
              disabled={marking}
              aria-label="Mark all notifications read"
              className="
                text-muted-foreground
                hover:text-foreground
                flex size-6 items-center justify-center rounded-sm
                disabled:opacity-50
              "
            >
              {marking ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <CheckCheck className="size-3.5" aria-hidden />
              )}
            </button>
          </Tooltip>
        </div>
      )}
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
  const className = "hover:bg-foreground/5 flex items-center gap-2.5 rounded-md px-2 py-1.5";
  const body = (
    <>
      <FeedThumb
        variant={notification.imageKind === "avatar" ? "avatar" : "cover"}
        src={notification.imageUrl}
        title={notification.text}
        fallback={<Bell className="size-4" aria-hidden />}
      />
      <div className="min-w-0 flex-1">
        <p className="text-foreground line-clamp-2 text-xs">{notification.text}</p>
        <p className="text-muted-foreground text-2xs flex items-center gap-1">
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
