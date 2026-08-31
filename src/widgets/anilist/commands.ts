import { AnilistServiceIcon } from "@/components/icons/service-icons";
import { matchesQuery, openResult } from "@/widgets/core/commandResult";
import { useIntegrationStore } from "@/integrations";
import { formatRelativeTime } from "@/lib/relative-time";
import type { CommandResult, WidgetCommand } from "@/widgets/core/types";
import { readPaged } from "@/widgets/core/usePagedResource";
import { readPolled } from "@/widgets/core/usePolledResource";
import { searchDiscover } from "@/widgets/anilist/lib/api/discover";
import {
  anilistActivity,
  anilistDiscover,
  anilistInbox,
  anilistLibrary,
} from "@/widgets/anilist/lib/resources";
import { progressLabel } from "@/widgets/anilist/lib/current";
import { listStatusLabel } from "@/widgets/anilist/lib/list-status";
import { DEFAULT_DATA, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { instanceData } from "@/widgets/core/instances";
import { needsAccount } from "@/widgets/core/commandSetup";
import {
  type AnilistActivity,
  type AnilistNotification,
  type CurrentData,
  type CurrentEntry,
  type DiscoverMedia,
  type DiscoverType,
  type ListStatus,
  type TitleLanguage,
} from "@/widgets/anilist/types";

const NOTIFICATIONS_URL = "https://anilist.co/notifications";

const KIND_LABEL: Record<DiscoverType, string> = { anime: "Anime", manga: "Manga" };

const STATUS_ORDER: Record<ListStatus, number> = {
  CURRENT: 0,
  REPEATING: 1,
  PLANNING: 2,
  COMPLETED: 3,
  PAUSED: 4,
  DROPPED: 5,
};

function viewerId(): number | null {
  const account = useIntegrationStore
    .getState()
    .accounts.find((entry) => entry.providerId === "anilist");
  if (account?.status !== "connected") return null;
  const id = Number(account.providerAccountId);
  return Number.isFinite(id) ? id : null;
}

function titleLanguage(): TitleLanguage {
  const [first] = instanceData("anilist", useAnilistStore.getState().byInstance, DEFAULT_DATA);
  return (first?.data ?? DEFAULT_DATA).titleLanguage;
}

function activityRow(activity: AnilistActivity): CommandResult {
  const said = `${activity.userName} ${activity.text}`;
  return {
    id: `anilist.activity.${activity.id}`,
    label: activity.mediaTitle ? `${said} · ${activity.mediaTitle}` : said,
    meta: formatRelativeTime(new Date(activity.createdAt * 1000).toISOString()),
    section: "Recent activity",
    artworkUrl: activity.coverImage ?? activity.userAvatar,
    run: () => openResult(activity.siteUrl),
  };
}

function notificationRow(notification: AnilistNotification): CommandResult {
  return {
    id: `anilist.notification.${notification.id}`,
    label: notification.text,
    meta: formatRelativeTime(notification.createdAt),
    section: "Notifications",
    artworkUrl: notification.imageUrl,
    run: () => openResult(notification.url ?? NOTIFICATIONS_URL),
  };
}

function libraryRow(entry: CurrentEntry): CommandResult {
  const behind = entry.behind !== null && entry.behind > 0 ? `${entry.behind} behind` : null;
  return {
    id: `anilist.entry.${entry.kind}.${entry.id}`,
    label: entry.title,
    detail: [KIND_LABEL[entry.kind], behind].filter(Boolean).join(" · "),
    meta: [progressLabel(entry), entry.score === undefined ? null : `★ ${entry.score}`]
      .filter(Boolean)
      .join(" · "),
    section: entry.status ? listStatusLabel(entry.status, entry.kind) : "Library",
    artworkUrl: entry.coverImageSmall ?? entry.coverImage,
    run: () => openResult(entry.siteUrl),
  };
}

function statusRank(entry: CurrentEntry): number {
  return entry.status ? STATUS_ORDER[entry.status] : Object.keys(STATUS_ORDER).length;
}

function libraryRows(data: CurrentData, needle: string): CommandResult[] {
  return data.entries
    .filter((entry) => matchesQuery(entry.title, needle))
    .sort(
      (a, b) =>
        statusRank(a) - statusRank(b) ||
        a.kind.localeCompare(b.kind) ||
        a.title.localeCompare(b.title),
    )
    .map(libraryRow);
}

function mediaRow(media: DiscoverMedia, section: string): CommandResult {
  return {
    id: `anilist.media.${media.kind}.${media.id}`,
    label: media.title,
    detail: [media.format?.replace(/_/g, " "), ...(media.genres ?? [])].filter(Boolean).join(" · "),
    meta: media.averageScore === undefined ? undefined : `★ ${media.averageScore}%`,
    section,
    artworkUrl: media.coverImageSmall ?? media.coverImage,
    run: () => openResult(media.siteUrl),
  };
}

async function findMedia(
  query: string,
  type: DiscoverType,
  signal: AbortSignal,
): Promise<CommandResult[]> {
  const lang = titleLanguage();
  const authed = viewerId() !== null;
  const trending = query === "";
  const found = trending
    ? await readPolled(anilistDiscover(lang, "trending", type, authed))
    : await searchDiscover(lang, query, type, authed, signal);
  const section = trending ? `Trending ${KIND_LABEL[type].toLowerCase()}` : KIND_LABEL[type];
  return found.map((media) => mediaRow(media, section));
}

const SEARCH_SCOPES = [
  {
    id: "anilist.search",
    label: "Search AniList",
    description: "Find an anime or manga on AniList",
    types: ["anime", "manga"],
    keywords: ["find", "media", "title", "trending"],
  },
  {
    id: "anilist.search.anime",
    label: "Search anime",
    description: "Find an anime on AniList",
    types: ["anime"],
    keywords: ["find", "series", "episode", "trending"],
  },
  {
    id: "anilist.search.manga",
    label: "Search manga",
    description: "Find a manga on AniList",
    types: ["manga"],
    keywords: ["find", "chapter", "read", "trending"],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  description: string;
  types: readonly DiscoverType[];
  keywords: readonly string[];
}[];

const SEARCH_COMMANDS: readonly WidgetCommand[] = SEARCH_SCOPES.map((scope) => ({
  kind: "provider",
  id: scope.id,
  label: scope.label,
  description: scope.description,
  icon: AnilistServiceIcon,
  keywords: scope.keywords,
  placeholder: scope.label,
  emptyMessage: (query) =>
    query === ""
      ? "Nothing trending on AniList right now."
      : `Nothing on AniList matched “${query}”.`,
  search: async (query, signal) => {
    const found = await Promise.all(scope.types.map((type) => findMedia(query, type, signal)));
    return found.flat();
  },
}));

const ACCOUNT_COMMANDS: readonly WidgetCommand[] = [
  {
    kind: "provider",
    id: "anilist.feed",
    label: "Feed",
    description: "See the latest activity from the people you follow",
    icon: AnilistServiceIcon,
    keywords: ["activity", "following", "friends", "updates"],
    placeholder: "Search recent activity",
    emptyMessage: (query) =>
      query === "" ? "Nothing from the people you follow yet." : `No activity matched “${query}”.`,
    search: async (query) => {
      const viewer = viewerId();
      if (viewer === null) return [];
      const needle = query.trim();
      const activity = await readPaged(anilistActivity(viewer, titleLanguage()));
      return activity
        .filter((entry) =>
          matchesQuery(`${entry.userName} ${entry.text} ${entry.mediaTitle ?? ""}`, needle),
        )
        .map(activityRow);
    },
  },
  {
    kind: "provider",
    id: "anilist.notifications",
    label: "Notifications",
    description: "Read what AniList has been holding for you",
    icon: AnilistServiceIcon,
    keywords: ["inbox", "unread", "airing", "mentions"],
    placeholder: "Search notifications",
    emptyMessage: (query) =>
      query === "" ? "Inbox zero — nothing waiting." : `No notification matched “${query}”.`,
    search: async (query) => {
      const viewer = viewerId();
      if (viewer === null) return [];
      const needle = query.trim();
      const inbox = await readPaged(anilistInbox(viewer, titleLanguage()));
      return inbox.filter((entry) => matchesQuery(entry.text, needle)).map(notificationRow);
    },
  },
  {
    kind: "provider",
    id: "anilist.library",
    label: "My library",
    description: "Search the anime and manga on your own lists",
    icon: AnilistServiceIcon,
    keywords: ["list", "watching", "reading", "planning", "mine"],
    placeholder: "Search your library",
    emptyMessage: (query) =>
      query === "" ? "Your lists are empty." : `Nothing in your library matched “${query}”.`,
    search: async (query) => {
      const viewer = viewerId();
      if (viewer === null) return [];
      const data = await readPolled(anilistLibrary(viewer, titleLanguage()));
      return libraryRows(data, query.trim());
    },
  },
];

const anilistAccount = () => needsAccount("anilist", "AniList");

export const anilistCommands = (): WidgetCommand[] => [
  ...ACCOUNT_COMMANDS.map((command) => ({ ...command, setup: anilistAccount })),
  ...SEARCH_COMMANDS,
];
