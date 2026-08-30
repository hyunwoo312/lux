import type { PolledDefinition } from "@/widgets/core/usePolledResource";
import {
  fetchContributions,
  parseCachedContributions,
} from "@/widgets/github/lib/api/contributions";
import { fetchInbox, parseCachedInbox } from "@/widgets/github/lib/api/inbox";
import { fetchReleases, parseCachedReleases } from "@/widgets/github/lib/api/releases";
import {
  CONTRIBUTIONS_CACHE_KEY,
  INBOX_CACHE_KEY,
  INBOX_REFRESH_MS,
  RELEASES_CACHE_KEY,
  SLOW_REFRESH_MS,
  type ContributionsData,
  type InboxData,
  type ReleasesData,
} from "@/widgets/github/types";

export const githubInbox: PolledDefinition<InboxData> = {
  cacheKey: INBOX_CACHE_KEY,
  intervalMs: INBOX_REFRESH_MS,
  parse: parseCachedInbox,
  fetch: fetchInbox,
};

export const githubReleases: PolledDefinition<ReleasesData> = {
  cacheKey: RELEASES_CACHE_KEY,
  intervalMs: SLOW_REFRESH_MS,
  parse: parseCachedReleases,
  fetch: fetchReleases,
};

export const githubContributions: PolledDefinition<ContributionsData> = {
  cacheKey: CONTRIBUTIONS_CACHE_KEY,
  intervalMs: SLOW_REFRESH_MS,
  parse: parseCachedContributions,
  fetch: fetchContributions,
};
