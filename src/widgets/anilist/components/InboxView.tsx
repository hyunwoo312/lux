import { ROW } from "@/lib/row";
import { Bell, Inbox } from "lucide-react";
import { ErrorState, StateMessage } from "@/components/StateMessage";
import { formatRelativeTime } from "@/lib/relative-time";
import { usePagedDefinition } from "@/widgets/core/usePagedResource";
import { anilistInbox } from "@/widgets/anilist/lib/resources";
import { FeedList } from "@/widgets/anilist/components/FeedList";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { AnilistSkeleton } from "@/widgets/anilist/components/AnilistSkeleton";
import { useAnilistSync } from "@/widgets/anilist/useAnilistSync";
import { useAnilist } from "@/widgets/anilist/useAnilistStore";
import { type AnilistNotification } from "@/widgets/anilist/types";

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
    usePagedDefinition(anilistInbox(userId, lang), { enabled });
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
      <NotificationThumb notification={notification} />
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

function NotificationThumb({ notification }: { notification: AnilistNotification }) {
  if (!notification.imageUrl) {
    return (
      <span
        className="
          bg-foreground/10 text-ink-3 flex h-12 w-9 shrink-0 items-center justify-center rounded-md
        "
        aria-hidden
      >
        <Bell className="size-4" aria-hidden />
      </span>
    );
  }

  if (notification.imageKind === "avatar") {
    return (
      <span className="flex h-12 w-9 shrink-0 items-center justify-center">
        <MediaCover
          src={notification.imageUrl}
          title={notification.text}
          className="size-9 rounded-full"
        />
      </span>
    );
  }

  return (
    <MediaCover
      src={notification.imageUrl}
      title={notification.text}
      className="h-12 w-9 rounded-md"
    />
  );
}
