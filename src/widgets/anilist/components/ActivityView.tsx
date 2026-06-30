import { useCallback, useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { usePagedResource } from "@/widgets/core/usePagedResource";
import {
  fetchActivityPage,
  parseCachedActivity,
  toggleActivityLike,
} from "@/widgets/anilist/lib/anilist-api";
import { FeedList } from "@/widgets/anilist/components/FeedList";
import { FeedThumb } from "@/widgets/anilist/components/FeedThumb";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { AnilistPlaceholder } from "@/widgets/anilist/components/AnilistPlaceholder";
import { useAnilistSync } from "@/widgets/anilist/useAnilistSync";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { ANILIST_MAX_ITEMS, type AnilistActivity } from "@/widgets/anilist/types";

const REFRESH_MS = 3 * 60 * 1000;

export function ActivityView({ enabled, newTab }: { enabled: boolean; newTab: boolean }) {
  const setLastSeen = useAnilistStore((s) => s.setLastSeenActivity);
  const lang = useAnilist((d) => d.titleLanguage);
  const seenRef = useRef(useAnilistStore.getState().lastSeenActivityAt ?? 0);
  const { state, hasMore, isLoadingMore, isRefreshing, loadMore, refresh } = usePagedResource(
    (page, signal) => fetchActivityPage(page, lang, signal),
    {
      enabled,
      intervalMs: REFRESH_MS,
      maxItems: ANILIST_MAX_ITEMS,
      cacheKey: `anilist:activity:${lang}`,
      getKey: (activity) => activity.id,
      persist: true,
      parsePersisted: parseCachedActivity,
    },
  );
  useAnilistSync(refresh, isRefreshing);

  const [likes, setLikes] = useState<Record<number, boolean>>({});
  const likesRef = useRef(likes);
  likesRef.current = likes;
  const toggleLike = useCallback((activity: AnilistActivity) => {
    const current = likesRef.current[activity.id] ?? activity.isLiked;
    setLikes((prev) => ({ ...prev, [activity.id]: !current }));
    toggleActivityLike(activity.id).then(
      (isLiked) => setLikes((prev) => ({ ...prev, [activity.id]: isLiked })),
      () => setLikes((prev) => ({ ...prev, [activity.id]: current })),
    );
  }, []);

  const items = state.status === "success" ? state.items : [];
  const newest = items[0]?.createdAt;
  useEffect(() => {
    if (newest != null) setLastSeen(newest);
  }, [newest, setLastSeen]);

  if (state.status === "loading") return <AnilistPlaceholder>Loading activity…</AnilistPlaceholder>;
  if (state.status === "error")
    return <AnilistPlaceholder>Couldn’t load your feed.</AnilistPlaceholder>;
  if (state.status === "empty")
    return <AnilistPlaceholder>No recent activity from people you follow.</AnilistPlaceholder>;

  const seen = seenRef.current;
  const newCount = items.filter((activity) => activity.createdAt > seen).length;

  return (
    <FeedList
      items={items}
      getKey={(activity) => activity.id}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      loadMore={loadMore}
      header={
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
            Following
          </span>
          {newCount > 0 && (
            <span
              className="
                bg-primary text-primary-foreground text-2xs rounded-full px-1.5 py-0.5 font-semibold
                tabular-nums
              "
            >
              {newCount} new
            </span>
          )}
        </div>
      }
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
    <div className="hover:bg-foreground/5 flex items-center gap-2.5 rounded-md px-2 py-1.5">
      <a
        href={activity.siteUrl}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        {activity.coverImage ? (
          <span className="relative h-12 w-9 shrink-0 overflow-visible">
            <MediaCover
              src={activity.coverImage}
              title={activity.mediaTitle ?? activity.text}
              className="h-12 w-9"
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
          <p className="text-foreground line-clamp-2 text-xs leading-snug">
            <span className="font-medium">{activity.userName}</span>
            {activity.kind === "text" ? ":" : ""}{" "}
            <span className="text-muted-foreground">{activity.text}</span>
          </p>
          <p className="text-muted-foreground text-2xs flex items-center gap-1">
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
        text-muted-foreground
        hover:text-foreground
        flex size-7 shrink-0 items-center justify-center rounded-sm
      "
    >
      <Heart className={cn("size-4", liked && "fill-primary text-primary")} />
    </button>
  );
}
