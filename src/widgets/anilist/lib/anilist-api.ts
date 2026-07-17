import { z } from "zod";
import { integrationFetch } from "@/integrations";
import { rateLimitError } from "@/lib/rate-limit";
import { computeBehind, sumWaiting } from "@/widgets/anilist/lib/current";
import {
  ANILIST_MAX_ITEMS,
  ANILIST_PAGE_SIZE,
  type AnilistActivity,
  type AnilistNotification,
  type DiscoverMedia,
  SCORE_FORMATS,
  type CurrentData,
  type CurrentEntry,
  type MediaKind,
  type ScoreFormat,
  type TitleLanguage,
} from "@/widgets/anilist/types";

export type Page<T> = { items: T[]; hasNextPage: boolean };

const ENDPOINT = "https://graphql.anilist.co";

const TITLE_SELECTION = "title { romaji english native }";

const titleSchema = z
  .object({
    romaji: z.string().nullable(),
    english: z.string().nullable(),
    native: z.string().nullable(),
  })
  .nullable();

function pickTitle(title: z.infer<typeof titleSchema>, lang: TitleLanguage): string | null {
  if (!title) return null;
  return title[lang] ?? title.romaji ?? title.english ?? title.native ?? null;
}

async function anilistGraphQL(
  query: string,
  variables: Record<string, unknown>,
  authed: boolean,
  signal?: AbortSignal,
): Promise<unknown> {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
  };
  const response = authed
    ? await integrationFetch("anilist", ENDPOINT, init)
    : await fetch(ENDPOINT, init);
  if (!response.ok) {
    throw rateLimitError(response) ?? new Error("AniList request failed");
  }
  return response.json();
}

const MEDIA_FRAGMENT = `fragment mediaFields on Media {
  id
  type
  ${TITLE_SELECTION}
  coverImage { medium color }
  episodes
  chapters
  format
  siteUrl
  nextAiringEpisode { episode airingAt }
}`;

const mediaSchema = z.object({
  id: z.number(),
  type: z.enum(["ANIME", "MANGA"]).nullable(),
  title: titleSchema,
  coverImage: z.object({ medium: z.string().nullable(), color: z.string().nullable() }).nullable(),
  episodes: z.number().nullable(),
  chapters: z.number().nullable(),
  format: z.string().nullable(),
  siteUrl: z.string().nullable(),
  nextAiringEpisode: z.object({ episode: z.number(), airingAt: z.number() }).nullable(),
});

type MediaNode = z.infer<typeof mediaSchema>;

const DEFAULT_SCORE_FORMAT: ScoreFormat = "POINT_10";

const CURRENT_QUERY = `query ($userId: Int!) {
  Viewer { mediaListOptions { scoreFormat } }
  anime: MediaListCollection(userId: $userId, type: ANIME, status_in: [CURRENT, REPEATING]) {
    lists { entries { progress score updatedAt media { ...mediaFields } } }
  }
  manga: MediaListCollection(userId: $userId, type: MANGA, status_in: [CURRENT, REPEATING]) {
    lists { entries { progress score updatedAt media { ...mediaFields } } }
  }
}
${MEDIA_FRAGMENT}`;

const collectionSchema = z
  .object({
    lists: z.array(
      z.object({
        entries: z.array(
          z.object({
            progress: z.number().nullable(),
            score: z.number().nullable(),
            updatedAt: z.number().nullable(),
            media: mediaSchema.nullable(),
          }),
        ),
      }),
    ),
  })
  .nullable();

const currentSchema = z.object({
  data: z.object({
    Viewer: z
      .object({
        mediaListOptions: z.object({ scoreFormat: z.enum(SCORE_FORMATS).nullable() }).nullable(),
      })
      .nullable(),
    anime: collectionSchema,
    manga: collectionSchema,
  }),
});

function toCurrentEntry(
  kind: MediaKind,
  progress: number,
  score: number | null,
  updatedAt: number | null,
  media: MediaNode,
  lang: TitleLanguage,
): CurrentEntry | null {
  const title = pickTitle(media.title, lang);
  if (!title || !media.siteUrl) return null;
  const total = kind === "anime" ? media.episodes : media.chapters;
  const nextEpisode = kind === "anime" ? media.nextAiringEpisode : null;
  return {
    id: media.id,
    kind,
    title,
    coverImage: media.coverImage?.medium ?? undefined,
    coverColor: media.coverImage?.color ?? undefined,
    siteUrl: media.siteUrl,
    progress,
    total,
    behind: computeBehind(kind, progress, total, nextEpisode?.episode ?? null),
    nextEpisode: nextEpisode ?? undefined,
    score: score && score > 0 ? score : undefined,
    updatedAt: updatedAt ?? undefined,
  };
}

function collectEntries(
  kind: MediaKind,
  collection: z.infer<typeof collectionSchema>,
  lang: TitleLanguage,
): CurrentEntry[] {
  if (!collection) return [];
  return collection.lists.flatMap((list) =>
    list.entries.flatMap((entry) => {
      if (!entry.media) return [];
      const built = toCurrentEntry(
        kind,
        entry.progress ?? 0,
        entry.score,
        entry.updatedAt,
        entry.media,
        lang,
      );
      return built ? [built] : [];
    }),
  );
}

export async function fetchCurrent(
  userId: number,
  lang: TitleLanguage,
  signal?: AbortSignal,
): Promise<CurrentData> {
  if (!Number.isFinite(userId)) {
    throw new Error("AniList account is missing an id");
  }
  const parsed = currentSchema.safeParse(
    await anilistGraphQL(CURRENT_QUERY, { userId }, true, signal),
  );
  if (!parsed.success) {
    throw new Error("Unexpected AniList current response");
  }
  const entries = [
    ...collectEntries("anime", parsed.data.data.anime, lang),
    ...collectEntries("manga", parsed.data.data.manga, lang),
  ]
    .sort((a, b) => (b.behind ?? -1) - (a.behind ?? -1))
    .slice(0, ANILIST_MAX_ITEMS);
  const scoreFormat =
    parsed.data.data.Viewer?.mediaListOptions?.scoreFormat ?? DEFAULT_SCORE_FORMAT;
  return { entries, waiting: sumWaiting(entries), scoreFormat };
}

const SAVE_PROGRESS_MUTATION = `mutation ($mediaId: Int!, $progress: Int!) {
  SaveMediaListEntry(mediaId: $mediaId, progress: $progress) { id progress }
}`;

const saveProgressSchema = z.object({
  data: z.object({
    SaveMediaListEntry: z.object({ progress: z.number().nullable() }).nullable(),
  }),
});

export async function saveProgress(
  mediaId: number,
  progress: number,
  signal?: AbortSignal,
): Promise<number> {
  const parsed = saveProgressSchema.safeParse(
    await anilistGraphQL(SAVE_PROGRESS_MUTATION, { mediaId, progress }, true, signal),
  );
  if (!parsed.success || !parsed.data.data.SaveMediaListEntry) {
    throw new Error("Couldn't update progress");
  }
  return parsed.data.data.SaveMediaListEntry.progress ?? progress;
}

const UNREAD_QUERY = `query { Viewer { unreadNotificationCount } }`;

const MARK_READ_QUERY = `query {
  Page(page: 1, perPage: 1) { notifications(resetNotificationCount: true) { __typename } }
}`;

export async function markAllNotificationsRead(signal?: AbortSignal): Promise<void> {
  await anilistGraphQL(MARK_READ_QUERY, {}, true, signal);
}

const INBOX_QUERY = `query ($page: Int!) {
  Page(page: $page, perPage: ${ANILIST_PAGE_SIZE}) {
    pageInfo { hasNextPage }
    notifications(resetNotificationCount: false) {
      ... on AiringNotification {
        id type createdAt episode
        media { ${TITLE_SELECTION} coverImage { medium } siteUrl }
      }
      ... on FollowingNotification {
        id type createdAt context user { name avatar { medium } siteUrl }
      }
      ... on ActivityMessageNotification {
        id type createdAt context user { name avatar { medium } siteUrl }
      }
      ... on ActivityMentionNotification {
        id type createdAt context user { name avatar { medium } siteUrl }
      }
      ... on ActivityReplyNotification {
        id type createdAt context user { name avatar { medium } siteUrl }
      }
      ... on ActivityLikeNotification {
        id type createdAt context user { name avatar { medium } siteUrl }
      }
      ... on ThreadCommentMentionNotification {
        id type createdAt context user { name avatar { medium } siteUrl }
      }
      ... on RelatedMediaAdditionNotification {
        id type createdAt context
        media { ${TITLE_SELECTION} coverImage { medium } siteUrl }
      }
    }
  }
}`;

const notificationNodeSchema = z.object({
  id: z.number(),
  createdAt: z.number().nullable(),
  episode: z.number().nullish(),
  context: z.string().nullish(),
  media: z
    .object({
      title: titleSchema,
      coverImage: z.object({ medium: z.string().nullable() }).nullable(),
      siteUrl: z.string().nullable(),
    })
    .nullish(),
  user: z
    .object({
      name: z.string().nullable(),
      avatar: z.object({ medium: z.string().nullable() }).nullable(),
      siteUrl: z.string().nullish(),
    })
    .nullish(),
});

const inboxSchema = z.object({
  data: z.object({
    Page: z
      .object({
        pageInfo: z.object({ hasNextPage: z.boolean() }),
        notifications: z.array(z.unknown()),
      })
      .nullable(),
  }),
});

const unreadSchema = z.object({
  data: z.object({
    Viewer: z.object({ unreadNotificationCount: z.number().nullable() }).nullable(),
  }),
});

function toNotification(node: unknown, lang: TitleLanguage): AnilistNotification | null {
  const parsed = notificationNodeSchema.safeParse(node);
  if (!parsed.success) return null;
  const data = parsed.data;
  const createdAt = data.createdAt ? new Date(data.createdAt * 1000).toISOString() : undefined;
  if (!createdAt) return null;

  if (data.episode != null && data.media) {
    const title = pickTitle(data.media.title, lang) ?? "an anime";
    return {
      id: data.id,
      text: `Episode ${data.episode} of ${title} aired`,
      createdAt,
      imageUrl: data.media.coverImage?.medium ?? undefined,
      imageKind: "cover",
      url: data.media.siteUrl ?? undefined,
    };
  }

  if (data.media && data.context) {
    const title = pickTitle(data.media.title, lang) ?? "A title";
    return {
      id: data.id,
      text: `${title}${data.context}`,
      createdAt,
      imageUrl: data.media.coverImage?.medium ?? undefined,
      imageKind: "cover",
      url: data.media.siteUrl ?? undefined,
    };
  }

  if (data.user && data.context && data.user.name) {
    return {
      id: data.id,
      text: `${data.user.name}${data.context}`,
      createdAt,
      imageUrl: data.user.avatar?.medium ?? undefined,
      imageKind: "avatar",
      url: data.user.siteUrl ?? undefined,
    };
  }

  return null;
}

export async function fetchInboxPage(
  page: number,
  lang: TitleLanguage,
  signal?: AbortSignal,
): Promise<Page<AnilistNotification>> {
  const parsed = inboxSchema.safeParse(await anilistGraphQL(INBOX_QUERY, { page }, true, signal));
  if (!parsed.success) {
    throw new Error("Unexpected AniList inbox response");
  }
  const items = (parsed.data.data.Page?.notifications ?? [])
    .map((node) => toNotification(node, lang))
    .filter((entry): entry is AnilistNotification => entry !== null);
  return { items, hasNextPage: parsed.data.data.Page?.pageInfo.hasNextPage ?? false };
}

export async function fetchUnreadCount(signal?: AbortSignal): Promise<number> {
  const parsed = unreadSchema.safeParse(await anilistGraphQL(UNREAD_QUERY, {}, true, signal));
  if (!parsed.success) return 0;
  return parsed.data.data.Viewer?.unreadNotificationCount ?? 0;
}

const ACTIVITY_QUERY = `query ($page: Int!) {
  Page(page: $page, perPage: ${ANILIST_PAGE_SIZE}) {
    pageInfo { hasNextPage }
    activities(isFollowing: true, sort: ID_DESC) {
      ... on ListActivity {
        id createdAt status progress siteUrl isLiked
        user { name avatar { medium } }
        media { ${TITLE_SELECTION} coverImage { medium } }
      }
      ... on TextActivity {
        id createdAt text siteUrl isLiked
        user { name avatar { medium } }
      }
    }
  }
}`;

const activityNodeSchema = z.object({
  id: z.number(),
  createdAt: z.number().nullable(),
  status: z.string().nullish(),
  progress: z.string().nullish(),
  text: z.string().nullish(),
  siteUrl: z.string().nullable(),
  isLiked: z.boolean().nullish(),
  user: z
    .object({
      name: z.string().nullable(),
      avatar: z.object({ medium: z.string().nullable() }).nullable(),
    })
    .nullish(),
  media: z
    .object({
      title: titleSchema,
      coverImage: z.object({ medium: z.string().nullable() }).nullable(),
    })
    .nullish(),
});

const activitySchema = z.object({
  data: z.object({
    Page: z
      .object({
        pageInfo: z.object({ hasNextPage: z.boolean() }),
        activities: z.array(z.unknown()),
      })
      .nullable(),
  }),
});

function cleanActivityText(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/~~~|~!|!~/g, " ")
    .replace(/\bimg\d*\([^)]*\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toActivity(node: unknown, lang: TitleLanguage): AnilistActivity | null {
  const parsed = activityNodeSchema.safeParse(node);
  if (!parsed.success) return null;
  const data = parsed.data;
  const userName = data.user?.name;
  if (!userName || !data.siteUrl || data.createdAt == null) return null;

  const base = {
    id: data.id,
    createdAt: data.createdAt,
    userName,
    userAvatar: data.user?.avatar?.medium ?? undefined,
    siteUrl: data.siteUrl,
    isLiked: data.isLiked ?? false,
  };

  if (data.status) {
    const action = data.progress ? `${data.status} ${data.progress}` : data.status;
    return {
      ...base,
      kind: "list",
      text: action,
      mediaTitle: pickTitle(data.media?.title ?? null, lang) ?? undefined,
      coverImage: data.media?.coverImage?.medium ?? undefined,
    };
  }

  if (data.text) {
    return { ...base, kind: "text", text: cleanActivityText(data.text) };
  }

  return null;
}

export async function fetchActivityPage(
  page: number,
  lang: TitleLanguage,
  signal?: AbortSignal,
): Promise<Page<AnilistActivity>> {
  const parsed = activitySchema.safeParse(
    await anilistGraphQL(ACTIVITY_QUERY, { page }, true, signal),
  );
  if (!parsed.success) {
    throw new Error("Unexpected AniList activity response");
  }
  const items = (parsed.data.data.Page?.activities ?? [])
    .map((node) => toActivity(node, lang))
    .filter((entry): entry is AnilistActivity => entry !== null);
  return { items, hasNextPage: parsed.data.data.Page?.pageInfo.hasNextPage ?? false };
}

const TOGGLE_LIKE_MUTATION = `mutation ($id: Int!) {
  ToggleLikeV2(id: $id, type: ACTIVITY) {
    ... on ListActivity { id isLiked }
    ... on TextActivity { id isLiked }
  }
}`;

const toggleLikeSchema = z.object({
  data: z.object({
    ToggleLikeV2: z.object({ isLiked: z.boolean().nullable() }).nullable(),
  }),
});

export async function toggleActivityLike(id: number, signal?: AbortSignal): Promise<boolean> {
  const parsed = toggleLikeSchema.safeParse(
    await anilistGraphQL(TOGGLE_LIKE_MUTATION, { id }, true, signal),
  );
  if (!parsed.success || !parsed.data.data.ToggleLikeV2) {
    throw new Error("Couldn't update like");
  }
  return parsed.data.data.ToggleLikeV2.isLiked ?? false;
}

const DISCOVER_QUERY = `query {
  Page(page: 1, perPage: 30) {
    media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { ...mediaFields }
  }
}
${MEDIA_FRAGMENT}`;

const discoverSchema = z.object({
  data: z.object({ Page: z.object({ media: z.array(mediaSchema) }).nullable() }),
});

export async function fetchDiscover(
  lang: TitleLanguage,
  signal?: AbortSignal,
): Promise<DiscoverMedia[]> {
  const parsed = discoverSchema.safeParse(await anilistGraphQL(DISCOVER_QUERY, {}, false, signal));
  if (!parsed.success) {
    throw new Error("Unexpected AniList discover response");
  }
  return (
    parsed.data.data.Page?.media.flatMap((media) => {
      const title = pickTitle(media.title, lang);
      if (!title || !media.siteUrl) return [];
      return [
        {
          id: media.id,
          kind: "anime" as const,
          title,
          coverImage: media.coverImage?.medium ?? undefined,
          coverColor: media.coverImage?.color ?? undefined,
          format: media.format ?? undefined,
          siteUrl: media.siteUrl,
        },
      ];
    }) ?? []
  );
}

const currentEntrySchema = z.object({
  id: z.number(),
  kind: z.enum(["anime", "manga"]),
  title: z.string(),
  coverImage: z.string().optional(),
  coverColor: z.string().optional(),
  siteUrl: z.string(),
  progress: z.number(),
  total: z.number().nullable(),
  behind: z.number().nullable(),
  nextEpisode: z.object({ episode: z.number(), airingAt: z.number() }).optional(),
  score: z.number().optional(),
  updatedAt: z.number().optional(),
});

const currentDataSchema = z.object({
  entries: z.array(currentEntrySchema),
  waiting: z.object({ episodes: z.number(), chapters: z.number() }),
  scoreFormat: z.enum(SCORE_FORMATS).default(DEFAULT_SCORE_FORMAT),
});

const discoverMediaSchema = z.object({
  id: z.number(),
  kind: z.enum(["anime", "manga"]),
  title: z.string(),
  coverImage: z.string().optional(),
  coverColor: z.string().optional(),
  format: z.string().optional(),
  siteUrl: z.string(),
});

const notificationSchema = z.object({
  id: z.number(),
  text: z.string(),
  createdAt: z.string(),
  imageUrl: z.string().optional(),
  imageKind: z.enum(["cover", "avatar"]).optional(),
  url: z.string().optional(),
});

const activitySchemaPersisted = z.object({
  id: z.number(),
  kind: z.enum(["list", "text"]),
  createdAt: z.number(),
  userName: z.string(),
  userAvatar: z.string().optional(),
  text: z.string(),
  mediaTitle: z.string().optional(),
  coverImage: z.string().optional(),
  siteUrl: z.string(),
  isLiked: z.boolean(),
});

export function parseCachedCurrent(raw: unknown): CurrentData | null {
  const result = currentDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseCachedDiscover(raw: unknown): DiscoverMedia[] | null {
  const result = z.array(discoverMediaSchema).safeParse(raw);
  return result.success ? result.data : null;
}

export function parseCachedInbox(raw: unknown): AnilistNotification[] | null {
  const result = z.array(notificationSchema).safeParse(raw);
  return result.success ? result.data : null;
}

export function parseCachedActivity(raw: unknown): AnilistActivity[] | null {
  const result = z.array(activitySchemaPersisted).safeParse(raw);
  return result.success ? result.data : null;
}
