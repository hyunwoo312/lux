import type { PagedDefinition } from "@/widgets/core/usePagedResource";
import type { PolledDefinition } from "@/widgets/core/usePolledResource";
import {
  parseCachedActivity,
  parseCachedCurrent,
  parseCachedDiscover,
  parseCachedInbox,
} from "@/widgets/anilist/lib/api/cache";
import { fetchDiscover } from "@/widgets/anilist/lib/api/discover";
import {
  fetchActivityPage,
  fetchInboxPage,
  fetchUnreadCount,
} from "@/widgets/anilist/lib/api/feed";
import { fetchList } from "@/widgets/anilist/lib/api/list";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import {
  ACTIVITY_REFRESH_MS,
  ANILIST_MAX_ITEMS,
  ANILIST_REFRESH_MS,
  DISCOVER_REFRESH_MS,
  type AnilistActivity,
  type AnilistNotification,
  type CurrentData,
  type DiscoverFeed,
  type DiscoverMedia,
  type DiscoverType,
  type TitleLanguage,
} from "@/widgets/anilist/types";

export function anilistLibrary(
  viewerId: number,
  lang: TitleLanguage,
): PolledDefinition<CurrentData> {
  return {
    cacheKey: anilistKeys.library(viewerId, lang),
    intervalMs: ANILIST_REFRESH_MS,
    parse: parseCachedCurrent,
    fetch: (signal) => fetchList(viewerId, lang, signal),
  };
}

export function anilistDiscover(
  lang: TitleLanguage,
  feed: DiscoverFeed,
  type: DiscoverType,
  authed: boolean,
): PolledDefinition<DiscoverMedia[]> {
  return {
    cacheKey: anilistKeys.discover(lang, feed, type),
    intervalMs: DISCOVER_REFRESH_MS,
    parse: parseCachedDiscover,
    fetch: (signal) => fetchDiscover(lang, feed, type, authed, signal),
  };
}

export function anilistActivity(
  viewerId: number,
  lang: TitleLanguage,
): PagedDefinition<AnilistActivity> {
  return {
    cacheKey: anilistKeys.activity(viewerId, lang),
    intervalMs: ACTIVITY_REFRESH_MS,
    maxItems: ANILIST_MAX_ITEMS,
    getKey: (activity) => activity.id,
    parse: parseCachedActivity,
    fetch: (page, signal) => fetchActivityPage(page, lang, signal),
  };
}

export function anilistInbox(
  viewerId: number,
  lang: TitleLanguage,
): PagedDefinition<AnilistNotification> {
  return {
    cacheKey: anilistKeys.inbox(viewerId, lang),
    intervalMs: ANILIST_REFRESH_MS,
    maxItems: ANILIST_MAX_ITEMS,
    getKey: (notification) => notification.id,
    parse: parseCachedInbox,
    fetch: (page, signal) => fetchInboxPage(page, lang, signal),
  };
}

export function anilistUnread(viewerId: number): PolledDefinition<number> {
  return {
    cacheKey: anilistKeys.unread(viewerId),
    intervalMs: ANILIST_REFRESH_MS,
    parse: (raw) => (typeof raw === "number" ? raw : null),
    fetch: fetchUnreadCount,
  };
}
