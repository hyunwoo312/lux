import { useEffect, useMemo } from "react";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchReleases, parseCachedReleases } from "@/widgets/github/lib/api/releases";
import { ErrorState, StateMessage } from "@/components/StateMessage";
import { GithubStaleNotice } from "@/widgets/github/components/GithubStaleNotice";
import { isUnseen, newestPublishedAt } from "@/widgets/github/lib/releases-unseen";
import { visibleItems } from "@/widgets/github/lib/visibility";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";
import { useGithubSync } from "@/widgets/github/useGithubSync";
import {
  RELEASES_CACHE_KEY,
  SLOW_REFRESH_MS,
  type Release,
  type ReleasesData,
} from "@/widgets/github/types";

export function ReleasesView({ enabled, showPrivate }: { enabled: boolean; showPrivate: boolean }) {
  const newTab = useGithub((d) => d.openBehavior === "newTab");
  const { state, freshness, isRefreshing, refresh, lastSyncedAt } = usePolledResource(
    fetchReleases,
    {
      enabled,
      intervalMs: SLOW_REFRESH_MS,
      isEmpty: (data) => data.watchedCount === 0,
      cacheKey: RELEASES_CACHE_KEY,
      persist: true,
      parsePersisted: parseCachedReleases,
    },
  );
  useGithubSync(refresh, isRefreshing, lastSyncedAt);

  if (state.status === "loading") return <StateMessage message="Loading releases…" />;
  if (state.status === "error")
    return (
      <ErrorState
        error={state.error}
        service="GitHub"
        subject="releases"
        onRetry={refresh}
        retrying={isRefreshing}
      />
    );
  if (state.status === "empty")
    return <StateMessage icon={Tag} message="Watch a repository to follow its releases." />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ReleaseList data={state.data} showPrivate={showPrivate} newTab={newTab} markSeen />
      <GithubStaleNotice freshness={freshness} />
    </div>
  );
}

export function ReleaseList({
  data,
  showPrivate,
  newTab,
  markSeen = false,
}: {
  data: ReleasesData;
  showPrivate: boolean;
  newTab: boolean;
  markSeen?: boolean;
}) {
  const lastSeenAt = useGithubStore((s) => s.lastSeenReleaseAt);
  const markReleasesSeen = useGithubStore((s) => s.markReleasesSeen);
  const releases = useMemo(
    () => visibleItems(data.releases, showPrivate),
    [data.releases, showPrivate],
  );
  const newest = newestPublishedAt(releases);

  useEffect(() => {
    if (markSeen) markReleasesSeen(newest);
  }, [markSeen, newest, markReleasesSeen]);

  if (releases.length === 0) {
    return (
      <StateMessage
        icon={Tag}
        message={
          data.releases.length > 0
            ? "The only releases are from private repositories, which this widget hides."
            : "None of the repositories you watch have published a release."
        }
      />
    );
  }

  return (
    <div className="scroll-fade flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1">
      {releases.map((release) => (
        <ReleaseRow
          key={release.repo}
          release={release}
          newTab={newTab}
          unseen={isUnseen(release, lastSeenAt)}
        />
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

function ReleaseRow({
  release,
  newTab,
  unseen,
}: {
  release: Release;
  newTab: boolean;
  unseen: boolean;
}) {
  const detail =
    release.name === release.tagName ? release.name : `${release.tagName} · ${release.name}`;

  return (
    <a
      href={release.url}
      target={newTab ? "_blank" : undefined}
      rel="noreferrer"
      className="hover:bg-foreground/5 flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5"
    >
      <span className="relative flex size-3.5 shrink-0 items-center justify-center">
        <Tag className={cn("size-3.5", unseen ? "text-primary" : "text-ink-3")} aria-hidden />
        {unseen && (
          <span
            aria-hidden
            className="bg-primary absolute -top-0.5 -right-0.5 size-1.5 rounded-full"
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-caption font-medium">
          {release.repo}
          {unseen && <span className="sr-only"> — new since you last looked</span>}
        </p>
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
