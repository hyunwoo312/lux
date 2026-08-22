import { useCallback, useEffect, useRef, useState } from "react";
import { ROW } from "@/lib/row";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { usePagedResource } from "@/widgets/core/usePagedResource";
import { fetchActivityPage, toggleActivityLike } from "@/widgets/anilist/lib/api/feed";
import { parseCachedActivity } from "@/widgets/anilist/lib/api/cache";
import { AnilistStaleNotice } from "@/widgets/anilist/components/AnilistStaleNotice";
import { loadFailureMessage, writeFailureMessage } from "@/widgets/anilist/lib/load-failure";
import { FeedList } from "@/widgets/anilist/components/FeedList";
import { FeedThumb } from "@/widgets/anilist/components/FeedThumb";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { AnilistSkeleton } from "@/widgets/anilist/components/AnilistSkeleton";
import { AnilistWriteNotice } from "@/widgets/anilist/components/AnilistWriteNotice";
import { AnilistPlaceholder } from "@/widgets/anilist/components/AnilistPlaceholder";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { useAnilistSync } from "@/widgets/anilist/useAnilistSync";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import {
  ACTIVITY_OPEN_STALE_MS,
  ACTIVITY_REFRESH_MS,
  ACTIVITY_SEEN_DWELL_MS,
  ANILIST_MAX_ITEMS,
  ANILIST_PAGE_SIZE,
  type AnilistActivity,
} from "@/widgets/anilist/types";

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
  const {
    state,
    hasMore,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    lastSyncedAt,
    freshness,
  } = usePagedResource((page, signal) => fetchActivityPage(page, lang, signal), {
    enabled,
    intervalMs: ACTIVITY_REFRESH_MS,
    maxItems: ANILIST_MAX_ITEMS,
    cacheKey: anilistKeys.activity(userId, lang),
    getKey: (activity) => activity.id,
    persist: true,
    parsePersisted: parseCachedActivity,
  });
  useAnilistSync(refresh, isRefreshing, lastSyncedAt);

  const [likes, setLikes] = useState<Record<number, boolean>>({});
  const [likeError, setLikeError] = useState("");
  const likesRef = useRef(likes);
  likesRef.current = likes;
  const toggleLike = useCallback((activity: AnilistActivity) => {
    const current = likesRef.current[activity.id] ?? activity.isLiked;
    setLikes((prev) => ({ ...prev, [activity.id]: !current }));
    setLikeError("");
    toggleActivityLike(activity.id).then(
      (isLiked) => setLikes((prev) => ({ ...prev, [activity.id]: isLiked })),
      (error: Error) => {
        setLikes((prev) => ({ ...prev, [activity.id]: current }));
        setLikeError(writeFailureMessage(error, "Couldn’t update your like. Try again."));
      },
    );
  }, []);

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
    return <AnilistPlaceholder>{loadFailureMessage(state.error, "your feed")}</AnilistPlaceholder>;
  if (state.status === "empty")
    return <AnilistPlaceholder>No recent activity from people you follow.</AnilistPlaceholder>;

  const seen = seenRef.current;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AnilistStaleNotice freshness={freshness} />
      <AnilistWriteNotice message={likeError} />
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
            liked={likes[activity.id] ?? activity.isLiked}
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
  const time = formatRelativeTime(new Date(activity.createdAt * 1000).toISOString());
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
          <FeedThumb variant="avatar" src={activity.userAvatar} title={activity.userName} />
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
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className="
        press focus-ring cursor-pointer text-ink-3
        hover:text-ink
        flex size-7 shrink-0 items-center justify-center rounded-sm
      "
    >
      <Heart className={cn("size-4", liked && "fill-primary text-primary")} aria-hidden />
    </button>
  );
}
