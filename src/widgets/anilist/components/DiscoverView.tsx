import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfigSegmented, ConfigSelect } from "@/components/config/WidgetConfig";
import { useIntegrationStore } from "@/integrations";
import { useSettingsStore } from "@/settings";
import {
  usePolledResource,
  type Freshness,
  type PolledResourceState,
} from "@/widgets/core/usePolledResource";
import { saveListStatus } from "@/widgets/anilist/lib/api/list";
import { fetchDiscover } from "@/widgets/anilist/lib/api/discover";
import { parseCachedDiscover } from "@/widgets/anilist/lib/api/cache";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { useAnilistSync } from "@/widgets/anilist/useAnilistSync";
import { AlertCircle, SearchX } from "lucide-react";
import { ErrorState, StateMessage } from "@/components/StateMessage";
import { writeFailureMessage } from "@/widgets/anilist/lib/load-failure";
import { AnilistWriteNotice } from "@/widgets/anilist/components/AnilistWriteNotice";
import { cn } from "@/lib/utils";
import { COVER_GRID } from "@/widgets/anilist/components/coverGrid";
import { AnilistSkeleton } from "@/widgets/anilist/components/AnilistSkeleton";
import { AnilistStaleNotice } from "@/widgets/anilist/components/AnilistStaleNotice";
import { DiscoverRow } from "@/widgets/anilist/components/discover/DiscoverRow";
import { DiscoverSearchBar } from "@/widgets/anilist/components/discover/DiscoverSearchBar";
import { DiscoverTile } from "@/widgets/anilist/components/discover/DiscoverTile";
import {
  useDiscoverSearch,
  type DiscoverSearchState,
} from "@/widgets/anilist/components/discover/useDiscoverSearch";
import { discoverFeedLabel } from "@/widgets/anilist/lib/discover";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { DISCOVER_FEEDS, DISCOVER_REFRESH_MS } from "@/widgets/anilist/types";
import type { DiscoverMedia, DiscoverType, ListStatus, ViewMode } from "@/widgets/anilist/types";

const TYPE_OPTIONS: { value: DiscoverType; label: string }[] = [
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
];

type PlanningAdds = {
  statusOf: (media: DiscoverMedia) => ListStatus | undefined;
  isPending: (media: DiscoverMedia) => boolean;
  writeError: string | null;
  add: (media: DiscoverMedia) => void;
};

function usePlanningAdds(): PlanningAdds {
  const [added, setAdded] = useState<Record<number, ListStatus>>({});
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [writeError, setWriteError] = useState<string | null>(null);

  const add = (media: DiscoverMedia) => {
    if (pending[media.id]) return;
    setPending((prev) => ({ ...prev, [media.id]: true }));
    setWriteError(null);
    saveListStatus(media.id, "PLANNING")
      .then((status) => setAdded((prev) => ({ ...prev, [media.id]: status })))
      .catch((error: unknown) =>
        setWriteError(
          writeFailureMessage(error, `Couldn’t add ${media.title} to Planning. Try again.`),
        ),
      )
      .finally(() => setPending((prev) => ({ ...prev, [media.id]: false })));
  };

  return {
    statusOf: (media) => added[media.id] ?? media.listStatus,
    isPending: (media) => pending[media.id] ?? false,
    writeError,
    add,
  };
}

export function DiscoverView() {
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "anilist") ?? null,
  );
  const instanceId = useWidgetInstanceId();
  const newTab = useAnilist((d) => d.openBehavior === "newTab");
  const lang = useAnilist((d) => d.titleLanguage);
  const feed = useAnilist((d) => d.discoverFeed);
  const type = useAnilist((d) => d.discoverType);
  const viewMode = useAnilist((d) => d.viewMode);
  const feedOptions = useMemo(
    () => DISCOVER_FEEDS.map((value) => ({ value, label: discoverFeedLabel(value, type) })),
    [type],
  );
  const setFeed = useAnilistStore((s) => s.setDiscoverFeed);
  const setType = useAnilistStore((s) => s.setDiscoverType);

  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  const connected = account?.status === "connected";
  const needsReconnect = account?.status === "needsReconnect";
  const connectLabel = needsReconnect ? "Reconnect AniList" : "Connect AniList";
  const openAccounts = () => useSettingsStore.getState().openSettings("accounts");

  const adds = usePlanningAdds();
  const search = useDiscoverSearch(query, lang, type, connected);

  const { state, freshness, isRefreshing, refresh, lastSyncedAt } = usePolledResource(
    (signal) => fetchDiscover(lang, feed, type, connected, signal),
    {
      enabled: true,
      intervalMs: DISCOVER_REFRESH_MS,
      cacheKey: anilistKeys.discover(lang, feed, type),
      isEmpty: (data) => data.length === 0,
      persist: true,
      parsePersisted: parseCachedDiscover,
    },
  );
  useAnilistSync(refresh, isRefreshing, lastSyncedAt);

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <DiscoverSearchBar value={query} onChange={setQuery} kind={type} />
      <div className="flex min-w-0 items-center justify-between gap-2 px-1">
        <div className="shrink-0">
          <ConfigSegmented
            label="Discover type"
            value={type}
            options={TYPE_OPTIONS}
            onChange={(value) => setType(instanceId, value)}
          />
        </div>
        {isSearching ? (
          <span className="text-ink-4 text-micro truncate font-semibold tracking-wide uppercase">
            Search results
          </span>
        ) : connected ? (
          <ConfigSelect
            label="Discover feed"
            value={feed}
            options={feedOptions}
            onChange={(value) => setFeed(instanceId, value)}
            triggerClassName="w-auto"
          />
        ) : (
          <span className="text-ink-4 text-micro truncate font-semibold tracking-wide uppercase">
            {discoverFeedLabel(feed, type)}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {isSearching ? (
          <SearchBody
            state={search}
            query={trimmedQuery}
            viewMode={viewMode}
            newTab={newTab}
            connected={connected}
            adds={adds}
          />
        ) : (
          <DiscoverBody
            state={state}
            freshness={freshness}
            viewMode={viewMode}
            newTab={newTab}
            connected={connected}
            adds={adds}
          />
        )}
      </div>
      {!connected && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1">
          <p className="text-ink-3 text-micro min-w-0">
            {needsReconnect
              ? "Your AniList sign-in expired — reconnect to get your library and feed back."
              : "Connect for your library, progress tracking, your feed and notifications."}
          </p>
          <Button variant="outline" size="xs" onClick={openAccounts}>
            {connectLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function SearchBody({
  state,
  query,
  viewMode,
  newTab,
  connected,
  adds,
}: {
  state: DiscoverSearchState;
  query: string;
  viewMode: ViewMode;
  newTab: boolean;
  connected: boolean;
  adds: PlanningAdds;
}) {
  if (state.status === "idle" || state.status === "loading")
    return <AnilistSkeleton variant={viewMode} label="Searching…" />;
  if (state.status === "error")
    return <StateMessage icon={AlertCircle} tone="error" message={state.message} />;
  if (state.status === "empty")
    return <StateMessage icon={SearchX} message={`No results for “${query}”.`} />;

  return (
    <div className="flex h-full flex-col">
      <AnilistWriteNotice message={adds.writeError ?? ""} />
      <DiscoverList
        label="Search results"
        media={state.data}
        viewMode={viewMode}
        newTab={newTab}
        connected={connected}
        adds={adds}
      />
    </div>
  );
}

function DiscoverBody({
  state,
  freshness,
  viewMode,
  newTab,
  connected,
  adds,
}: {
  state: PolledResourceState<DiscoverMedia[]>;
  freshness: Freshness;
  viewMode: ViewMode;
  newTab: boolean;
  connected: boolean;
  adds: PlanningAdds;
}) {
  if (state.status === "loading")
    return <AnilistSkeleton variant={viewMode} label="Loading titles…" />;
  if (state.status === "error")
    return <ErrorState error={state.error} service="AniList" subject="trending titles" />;
  if (state.status === "empty") return <StateMessage message="Nothing to show here right now." />;

  return (
    <div className="flex h-full flex-col">
      <AnilistStaleNotice freshness={freshness} />
      <AnilistWriteNotice message={adds.writeError ?? ""} />
      <DiscoverList
        label="Discover"
        media={state.data}
        viewMode={viewMode}
        newTab={newTab}
        connected={connected}
        adds={adds}
      />
    </div>
  );
}

function DiscoverList({
  label,
  media,
  viewMode,
  newTab,
  connected,
  adds,
}: {
  label: string;
  media: DiscoverMedia[];
  viewMode: ViewMode;
  newTab: boolean;
  connected: boolean;
  adds: PlanningAdds;
}) {
  const list = viewMode === "list";

  return (
    <ul
      aria-label={label}
      className={cn(
        "scroll-fade min-h-0 flex-1 overflow-y-auto py-1",
        list ? "flex flex-col gap-0.5 px-1" : cn(COVER_GRID, "content-start px-1.5"),
      )}
    >
      {media.map((entry) =>
        list ? (
          <DiscoverRow
            key={entry.id}
            media={entry}
            newTab={newTab}
            listStatus={adds.statusOf(entry)}
            canAdd={connected}
            pending={adds.isPending(entry)}
            onAdd={() => adds.add(entry)}
          />
        ) : (
          <DiscoverTile
            key={entry.id}
            media={entry}
            newTab={newTab}
            listStatus={adds.statusOf(entry)}
            canAdd={connected}
            pending={adds.isPending(entry)}
            onAdd={() => adds.add(entry)}
          />
        ),
      )}
    </ul>
  );
}
