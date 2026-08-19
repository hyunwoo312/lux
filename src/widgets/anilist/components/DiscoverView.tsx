import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ConfigSegmented, ConfigSelect } from "@/components/config/WidgetConfig";
import { loadErrorMessage } from "@/lib/rate-limit";
import { useIntegrationStore } from "@/integrations";
import { useSettingsStore } from "@/settings";
import { usePolledResource, type PolledResourceState } from "@/widgets/core/usePolledResource";
import {
  fetchDiscover,
  parseCachedDiscover,
  saveListStatus,
} from "@/widgets/anilist/lib/anilist-api";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { AnilistPlaceholder } from "@/widgets/anilist/components/AnilistPlaceholder";
import { discoverFeedLabel } from "@/widgets/anilist/lib/discover";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type {
  DiscoverFeed,
  DiscoverMedia,
  DiscoverType,
  ListStatus,
} from "@/widgets/anilist/types";

const FEED_OPTIONS: { value: DiscoverFeed; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "season", label: "Popular now" },
  { value: "top", label: "Top rated" },
  { value: "upcoming", label: "Upcoming" },
];

const TYPE_OPTIONS: { value: DiscoverType; label: string }[] = [
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
];

const LIST_STATUS_LABEL: Record<string, string> = {
  CURRENT: "Watching",
  PLANNING: "Planned",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  PAUSED: "Paused",
  REPEATING: "Rewatching",
};

const REFRESH_MS = 30 * 60 * 1000;

export function DiscoverView() {
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "anilist") ?? null,
  );
  const instanceId = useWidgetInstanceId();
  const newTab = useAnilist((d) => d.openBehavior === "newTab");
  const lang = useAnilist((d) => d.titleLanguage);
  const feed = useAnilist((d) => d.discoverFeed);
  const type = useAnilist((d) => d.discoverType);
  const setFeed = useAnilistStore((s) => s.setDiscoverFeed);
  const setType = useAnilistStore((s) => s.setDiscoverType);

  const connected = account?.status === "connected";
  const needsReconnect = account?.status === "needsReconnect";

  const { state } = usePolledResource(
    (signal) => fetchDiscover(lang, feed, type, connected, signal),
    {
      enabled: true,
      intervalMs: REFRESH_MS,
      cacheKey: anilistKeys.discover(lang, feed, type),
      isEmpty: (data) => data.length === 0,
      persist: true,
      parsePersisted: parseCachedDiscover,
    },
  );

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <div className="flex min-w-0 items-center justify-between gap-2 px-1">
        <div className="shrink-0">
          <ConfigSegmented
            label="Discover type"
            value={type}
            options={TYPE_OPTIONS}
            onChange={(value) => setType(instanceId, value)}
          />
        </div>
        {connected ? (
          <ConfigSelect
            label="Discover feed"
            value={feed}
            options={FEED_OPTIONS}
            onChange={(value) => setFeed(instanceId, value)}
            triggerClassName="w-auto"
          />
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => useSettingsStore.getState().openSettings("accounts")}
          >
            {needsReconnect ? "Reconnect AniList" : "Connect AniList"}
          </Button>
        )}
      </div>
      {!connected && (
        <span className="text-muted-foreground text-2xs px-1 font-semibold tracking-wide uppercase">
          {discoverFeedLabel(feed, type)}
        </span>
      )}
      <div className="min-h-0 flex-1">
        <DiscoverBody state={state} newTab={newTab} connected={connected} />
      </div>
    </div>
  );
}

function DiscoverBody({
  state,
  newTab,
  connected,
}: {
  state: PolledResourceState<DiscoverMedia[]>;
  newTab: boolean;
  connected: boolean;
}) {
  const [added, setAdded] = useState<Record<number, ListStatus>>({});
  const [pending, setPending] = useState<Record<number, boolean>>({});

  const addToPlanning = (media: DiscoverMedia) => {
    if (pending[media.id]) return;
    setPending((prev) => ({ ...prev, [media.id]: true }));
    saveListStatus(media.id, "PLANNING")
      .then((status) => setAdded((prev) => ({ ...prev, [media.id]: status })))
      .catch(() => undefined)
      .finally(() => setPending((prev) => ({ ...prev, [media.id]: false })));
  };

  if (state.status === "loading") return <AnilistPlaceholder>Loading titles…</AnilistPlaceholder>;
  if (state.status === "error")
    return (
      <AnilistPlaceholder>
        {loadErrorMessage(state.error, "Couldn’t load titles.")}
      </AnilistPlaceholder>
    );
  if (state.status === "empty")
    return <AnilistPlaceholder>Nothing to show here right now.</AnilistPlaceholder>;

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto">
      {state.data.map((media) => (
        <DiscoverRow
          key={media.id}
          media={media}
          newTab={newTab}
          listStatus={added[media.id] ?? media.listStatus}
          canAdd={connected}
          pending={pending[media.id] ?? false}
          onAdd={() => addToPlanning(media)}
        />
      ))}
    </div>
  );
}

function DiscoverRow({
  media,
  newTab,
  listStatus,
  canAdd,
  pending,
  onAdd,
}: {
  media: DiscoverMedia;
  newTab: boolean;
  listStatus?: ListStatus;
  canAdd: boolean;
  pending: boolean;
  onAdd: () => void;
}) {
  return (
    <a
      href={media.siteUrl}
      target={newTab ? "_blank" : undefined}
      rel="noreferrer"
      className="hover:bg-foreground/5 flex items-center gap-2.5 rounded-md px-2 py-1.5"
    >
      <MediaCover
        src={media.coverImage}
        title={media.title}
        color={media.coverColor}
        className="h-12 w-9"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="text-foreground truncate text-xs font-medium">{media.title}</p>
          {listStatus && (
            <span
              className="
                border-border text-muted-foreground text-2xs shrink-0 rounded-full border px-1.5
                py-px
              "
            >
              {LIST_STATUS_LABEL[listStatus] ?? "On list"}
            </span>
          )}
        </div>
        <p className="text-muted-foreground truncate text-2xs">{describeMedia(media)}</p>
      </div>
      {media.averageScore !== undefined && (
        <span className="text-muted-foreground text-2xs shrink-0 font-semibold tabular-nums">
          {media.averageScore}%
        </span>
      )}
      {canAdd && !listStatus && (
        <Tooltip content="Add to Planning">
          <button
            type="button"
            aria-label={`Add ${media.title} to Planning`}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onAdd();
            }}
            className="
              text-muted-foreground/70 grid size-6 shrink-0 place-items-center rounded-sm
              transition-colors
              hover:text-foreground
              focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none
              disabled:pointer-events-none disabled:opacity-50
            "
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-3.5" aria-hidden />
            )}
          </button>
        </Tooltip>
      )}
    </a>
  );
}

function describeMedia(media: DiscoverMedia): string {
  const parts: string[] = [];
  if (media.format) parts.push(media.format.replace(/_/g, " "));
  if (media.episodes) parts.push(`${media.episodes} ep`);
  if (media.genres?.length) parts.push(media.genres.join(" · "));
  return parts.join(" — ");
}
