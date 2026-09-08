import { useCallback, useState } from "react";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { markAllNotificationsRead } from "@/widgets/anilist/lib/api/feed";
import { ActivityView } from "@/widgets/anilist/components/ActivityView";
import { InboxView } from "@/widgets/anilist/components/InboxView";
import { FeedSourceSelector } from "@/widgets/anilist/components/FeedSourceSelector";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useActivityUnseenCount, useUnreadCount } from "@/widgets/anilist/useAnilistSignals";
import { MarkAllReadButton } from "@/widgets/core/MarkAllReadButton";
import { reportWriteFailure } from "@/widgets/core/reportWriteFailure";

type FeedViewProps = {
  enabled: boolean;
  userId: number;
  newTab: boolean;
};

export function FeedView({ enabled, userId, newTab }: FeedViewProps) {
  const instanceId = useWidgetInstanceId();
  const source = useAnilist((d) => d.feedSource);
  const setFeedSource = useAnilistStore((s) => s.setFeedSource);
  const unseen = useActivityUnseenCount(enabled, userId);

  const {
    count: liveUnread,
    refresh: unreadRefresh,
    lastSyncedAt,
  } = useUnreadCount(enabled, userId);

  const [markedReadAt, setMarkedReadAt] = useState(0);
  const [marking, setMarking] = useState(false);

  const markRead = useCallback(() => {
    setMarking(true);
    setMarkedReadAt(Date.now());
    markAllNotificationsRead().then(
      () => {
        setMarking(false);
        unreadRefresh();
      },
      (error: unknown) => {
        setMarking(false);
        setMarkedReadAt(0);
        reportWriteFailure(
          "anilist-write",
          error,
          "Couldn’t mark your notifications read. Try again.",
        );
      },
    );
  }, [unreadRefresh]);

  const unreadCount = lastSyncedAt > markedReadAt ? liveUnread : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-1">
      <div className="flex min-w-0 items-center gap-1.5 px-1">
        <FeedSourceSelector
          value={source}
          counts={{ following: unseen, notifications: unreadCount }}
          onChange={(next) => setFeedSource(instanceId, next)}
        />
        {source === "notifications" && unreadCount > 0 && (
          <span className="ml-auto">
            <MarkAllReadButton marking={marking} onClick={markRead} />
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {source === "following" ? (
          <ActivityView enabled={enabled} userId={userId} newTab={newTab} />
        ) : (
          <InboxView enabled={enabled} userId={userId} newTab={newTab} unreadCount={unreadCount} />
        )}
      </div>
    </div>
  );
}
