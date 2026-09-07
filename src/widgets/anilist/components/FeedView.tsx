import { useCallback, useState } from "react";
import { CheckCheck } from "lucide-react";
import { loadErrorMessage } from "@/lib/net";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { markAllNotificationsRead } from "@/widgets/anilist/lib/api/feed";
import { ActivityView } from "@/widgets/anilist/components/ActivityView";
import { InboxView } from "@/widgets/anilist/components/InboxView";
import { AnilistWriteNotice } from "@/widgets/anilist/components/AnilistWriteNotice";
import { FeedSourceSelector } from "@/widgets/anilist/components/FeedSourceSelector";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useActivityUnseenCount, useUnreadCount } from "@/widgets/anilist/useAnilistSignals";
import { Button } from "@/components/ui/button";

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
  const [markError, setMarkError] = useState("");

  const markRead = useCallback(() => {
    setMarking(true);
    setMarkError("");
    setMarkedReadAt(Date.now());
    markAllNotificationsRead().then(
      () => {
        setMarking(false);
        unreadRefresh();
      },
      (error: unknown) => {
        setMarking(false);
        setMarkedReadAt(0);
        setMarkError(loadErrorMessage(error, "Couldn’t mark your notifications read. Try again."));
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
          <Tooltip content="Mark all read" prose>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={markRead}
              disabled={marking}
              aria-label="Mark all notifications read"
              className="text-ink-3 hover:text-ink ml-auto"
            >
              {marking ? <Spinner /> : <CheckCheck aria-hidden />}
            </Button>
          </Tooltip>
        )}
      </div>
      <AnilistWriteNotice message={markError} />
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
