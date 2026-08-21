import { useMemo } from "react";
import { Tag } from "lucide-react";
import { loadErrorMessage } from "@/lib/net";
import { formatRelativeTime } from "@/lib/relative-time";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchReleases, parseCachedReleases } from "@/widgets/github/lib/github-api";
import { GithubPlaceholder } from "@/widgets/github/components/GithubPlaceholder";
import { useGithub } from "@/widgets/github/useGithubStore";
import { useGithubSync } from "@/widgets/github/useGithubSync";
import type { Release, ReleasesData } from "@/widgets/github/types";

const REFRESH_MS = 30 * 60 * 1000;
const RELEASES_CACHE_KEY = "github:releases";

export function ReleasesView({ enabled, showPrivate }: { enabled: boolean; showPrivate: boolean }) {
  const newTab = useGithub((d) => d.openBehavior === "newTab");
  const { state, isRefreshing, refresh, lastSyncedAt } = usePolledResource(fetchReleases, {
    enabled,
    intervalMs: REFRESH_MS,
    isEmpty: (data) => data.watchedCount === 0,
    cacheKey: RELEASES_CACHE_KEY,
    persist: true,
    parsePersisted: parseCachedReleases,
  });
  useGithubSync(refresh, isRefreshing, lastSyncedAt);

  if (state.status === "loading") return <GithubPlaceholder>Loading releases…</GithubPlaceholder>;
  if (state.status === "error")
    return (
      <GithubPlaceholder>
        {loadErrorMessage(state.error, "Couldn’t load releases.")}
      </GithubPlaceholder>
    );
  if (state.status === "empty")
    return <GithubPlaceholder>Watch a repository to follow its releases.</GithubPlaceholder>;

  return <ReleaseList data={state.data} showPrivate={showPrivate} newTab={newTab} />;
}

export function ReleaseList({
  data,
  showPrivate,
  newTab,
}: {
  data: ReleasesData;
  showPrivate: boolean;
  newTab: boolean;
}) {
  const releases = useMemo(
    () => data.releases.filter((release) => showPrivate || !release.isPrivate),
    [data.releases, showPrivate],
  );

  if (releases.length === 0) {
    return (
      <GithubPlaceholder>
        {data.releases.length > 0
          ? "The only releases are from private repositories, which this widget hides."
          : "None of the repositories you watch have published a release."}
      </GithubPlaceholder>
    );
  }

  return (
    <div className="flex h-full flex-col gap-0.5 overflow-y-auto p-1">
      {releases.map((release) => (
        <ReleaseRow key={release.repo} release={release} newTab={newTab} />
      ))}
      {data.watchedCount > data.watchedScanned && (
        <p className="text-ink-4 text-micro shrink-0 px-2 py-1">
          Showing the {data.watchedScanned} most recently pushed of {data.watchedCount} watched
          repositories.
        </p>
      )}
    </div>
  );
}

function ReleaseRow({ release, newTab }: { release: Release; newTab: boolean }) {
  const detail =
    release.name === release.tagName ? release.name : `${release.tagName} · ${release.name}`;

  return (
    <a
      href={release.url}
      target={newTab ? "_blank" : undefined}
      rel="noreferrer"
      className="hover:bg-foreground/5 flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5"
    >
      <Tag className="text-ink-3 size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-caption font-medium">{release.repo}</p>
        <p className="text-ink-3 text-micro truncate">{detail}</p>
      </div>
      {release.isPrerelease && (
        <span className="border-border text-ink-3 text-micro shrink-0 rounded border px-1 py-px">
          Pre-release
        </span>
      )}
      <span className="text-ink-3 text-micro shrink-0 tabular-nums">
        {formatRelativeTime(release.publishedAt)}
      </span>
    </a>
  );
}
