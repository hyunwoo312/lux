import { useEffect, useRef } from "react";
import { ROW } from "@/lib/row";
import { Heart, Users } from "lucide-react";
import { ErrorState, StateMessage } from "@/components/StateMessage";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { patchPagedResource, usePagedDefinition } from "@/widgets/core/usePagedResource";
import { anilistActivity } from "@/widgets/anilist/lib/resources";
import { toggleActivityLike } from "@/widgets/anilist/lib/api/feed";
import { FeedList } from "@/widgets/anilist/components/FeedList";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { AnilistSkeleton } from "@/widgets/anilist/components/AnilistSkeleton";
import { useAnilistSync } from "@/widgets/anilist/useAnilistSync";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import {
  ACTIVITY_OPEN_STALE_MS,
  ACTIVITY_SEEN_DWELL_MS,
  ANILIST_PAGE_SIZE,
  type AnilistActivity,
} from "@/widgets/anilist/types";
import { Button } from "@/components/ui/button";
import { reportWriteFailure } from "@/widgets/core/reportWriteFailure";

export function ActivityView({
  enabled,
  userId,
  newTab,
}: {
  enabled: boolean;
  userId: number;
  newTab: boolean;
}) {
  const setLastSeen = useAnilistStore((s) => s.setLastSeenActivity);
  const lang = useAnilist((d) => d.titleLanguage);
  const seenRef = useRef(useAnilistStore.getState().lastSeenActivityAt ?? 0);
  const definition = anilistActivity(userId, lang);
  const { state, hasMore, isLoadingMore, isRefreshing, loadMore, refresh, lastSyncedAt } =
    usePagedDefinition(definition, { enabled });
  useAnilistSync(refresh, isRefreshing, lastSyncedAt);

  const setLiked = (id: number, isLiked: boolean) =>
    patchPagedResource<AnilistActivity>(definition.cacheKey, (items) =>
      items.map((item) => (item.id === id ? { ...item, isLiked } : item)),
    );
  const toggleLike = (activity: AnilistActivity) => {
    setLiked(activity.id, !activity.isLiked);
    toggleActivityLike(activity.id).then(
      (isLiked) => setLiked(activity.id, isLiked),
      (error: unknown) => {
        setLiked(activity.id, activity.isLiked);
        reportWriteFailure("anilist-write", error, "Couldn’t update your like. Try again.");
      },
    );
  };

  const items = state.status === "success" ? state.items : [];
  const pagedIn = items.length > ANILIST_PAGE_SIZE;
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    if (pagedIn) return;
    if (Date.now() - lastSyncedAt >= ACTIVITY_OPEN_STALE_MS) refresh();
  }, [pagedIn, lastSyncedAt, refresh]);

  const newest = items[0]?.createdAt;
  useEffect(() => {
    if (newest == null) return;
    let timer: number | undefined;
    const arm = () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      timer = window.setTimeout(() => setLastSeen(newest), ACTIVITY_SEEN_DWELL_MS);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [newest, setLastSeen]);

  if (state.status === "loading")
    return <AnilistSkeleton variant="list" label="Loading activity…" />;
  if (state.status === "error")
    return (
      <ErrorState
        error={state.error}
        service="AniList"
        subject="your feed"
        onRetry={refresh}
        retrying={isRefreshing}
      />
    );
  if (state.status === "empty")
    return <StateMessage icon={Users} message="No recent activity from people you follow." />;

  const seen = seenRef.current;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FeedList
        label="Recent activity"
        items={items}
        getKey={(activity) => activity.id}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        loadMore={loadMore}
        renderItem={(activity) => (
          <ActivityRow
            activity={activity}
            newTab={newTab}
            isNew={activity.createdAt > seen}
            liked={activity.isLiked}
            onToggleLike={() => toggleLike(activity)}
          />
        )}
      />
    </div>
  );
}

function ActivityRow({
  activity,
  newTab,
  isNew,
  liked,
  onToggleLike,
}: {
  activity: AnilistActivity;
  newTab: boolean;
  isNew: boolean;
  liked: boolean;
  onToggleLike: () => void;
}) {
  const time = formatRelativeTime(activity.createdAt);
  const meta = activity.mediaTitle ? `${activity.mediaTitle} · ${time}` : time;

  return (
    <div className="flex items-center gap-1">
      <a
        href={activity.siteUrl}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        className={cn(ROW.itemAction, "min-w-0 flex-1")}
      >
        {activity.coverImage ? (
          <span className="relative h-12 w-9 shrink-0 overflow-visible">
            <MediaCover
              src={activity.coverImage}
              title={activity.mediaTitle ?? activity.text}
              className="h-12 w-9 rounded-md"
            />
            <MediaCover
              src={activity.userAvatar}
              title={activity.userName}
              className="border-card absolute -right-2 -bottom-2 size-6 rounded-full border-2"
            />
          </span>
        ) : (
          <span className="flex h-12 w-9 shrink-0 items-center justify-center">
            <MediaCover
              src={activity.userAvatar}
              title={activity.userName}
              className="size-9 rounded-full"
            />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-ink line-clamp-2 text-caption leading-snug">
            <span className="font-medium">{activity.userName}</span>
            {activity.kind === "text" ? ":" : ""}{" "}
            <span className="text-ink-3">{activity.text}</span>
          </p>
          <p className="text-ink-3 text-micro flex items-center gap-1">
            {isNew && <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden />}
            <span className="truncate">{meta}</span>
          </p>
        </div>
      </a>
      <LikeButton liked={liked} onToggle={onToggleLike} />
    </div>
  );
}

function LikeButton({ liked, onToggle }: { liked: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className="text-ink-3 hover:text-ink"
    >
      <Heart className={cn(liked && "fill-primary text-primary")} aria-hidden />
    </Button>
  );
}
