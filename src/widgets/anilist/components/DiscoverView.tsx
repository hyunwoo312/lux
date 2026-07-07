import { Button } from "@/components/ui/button";
import { loadErrorMessage } from "@/lib/rate-limit";
import { useIntegrationStore } from "@/integrations";
import { useSettingsStore } from "@/settings";
import { usePolledResource, type PolledResourceState } from "@/widgets/core/usePolledResource";
import { fetchDiscover, parseCachedDiscover } from "@/widgets/anilist/lib/anilist-api";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { AnilistPlaceholder } from "@/widgets/anilist/components/AnilistPlaceholder";
import { useAnilist } from "@/widgets/anilist/useAnilistStore";
import type { DiscoverMedia } from "@/widgets/anilist/types";

const REFRESH_MS = 30 * 60 * 1000;

export function DiscoverView() {
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "anilist") ?? null,
  );
  const newTab = useAnilist((d) => d.openBehavior === "newTab");
  const lang = useAnilist((d) => d.titleLanguage);
  const { state } = usePolledResource((signal) => fetchDiscover(lang, signal), {
    enabled: true,
    intervalMs: REFRESH_MS,
    cacheKey: anilistKeys.discover(lang),
    isEmpty: (data) => data.length === 0,
    persist: true,
    parsePersisted: parseCachedDiscover,
  });

  const needsReconnect = account?.status === "needsReconnect";

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase">
          Trending now
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={() => useSettingsStore.getState().openSettings("accounts")}
        >
          {needsReconnect ? "Reconnect AniList" : "Connect AniList"}
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <DiscoverBody state={state} newTab={newTab} />
      </div>
    </div>
  );
}

function DiscoverBody({
  state,
  newTab,
}: {
  state: PolledResourceState<DiscoverMedia[]>;
  newTab: boolean;
}) {
  if (state.status === "loading")
    return <AnilistPlaceholder>Loading trending titles…</AnilistPlaceholder>;
  if (state.status === "error")
    return (
      <AnilistPlaceholder>
        {loadErrorMessage(state.error, "Couldn’t load trending titles.")}
      </AnilistPlaceholder>
    );
  if (state.status === "empty")
    return <AnilistPlaceholder>Nothing trending right now.</AnilistPlaceholder>;

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto">
      {state.data.map((media) => (
        <DiscoverRow key={media.id} media={media} newTab={newTab} />
      ))}
    </div>
  );
}

function DiscoverRow({ media, newTab }: { media: DiscoverMedia; newTab: boolean }) {
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
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-xs font-medium">{media.title}</p>
        {media.format && (
          <p className="text-muted-foreground text-2xs">{media.format.replace(/_/g, " ")}</p>
        )}
      </div>
    </a>
  );
}
