import { z } from "zod";
import { httpUrlSchema } from "@/lib/open-url";
import {
  TITLE_SELECTION,
  anilistGraphQL,
  pickTitle,
  titleSchema,
  type Page,
} from "@/widgets/anilist/lib/api/client";
import {
  ANILIST_PAGE_SIZE,
  type AnilistActivity,
  type AnilistNotification,
  type TitleLanguage,
} from "@/widgets/anilist/types";

const UNREAD_QUERY = `query { Viewer { unreadNotificationCount } }`;

const MARK_READ_QUERY = `query {
  Page(page: 1, perPage: 1) { notifications(resetNotificationCount: true) { __typename } }
}`;

const markReadSchema = z.object({
  data: z.object({
    Page: z.object({ notifications: z.array(z.unknown()) }).nullable(),
  }),
});

export async function markAllNotificationsRead(signal?: AbortSignal): Promise<void> {
  const parsed = markReadSchema.safeParse(await anilistGraphQL(MARK_READ_QUERY, {}, true, signal));
  if (!parsed.success || !parsed.data.data.Page) {
    throw new Error("Couldn't mark notifications as read");
  }
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
      siteUrl: httpUrlSchema.nullable().catch(null),
    })
    .nullish(),
  user: z
    .object({
      name: z.string().nullable(),
      avatar: z.object({ medium: z.string().nullable() }).nullable(),
      siteUrl: httpUrlSchema.nullish().catch(null),
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
  if (!parsed.success) {
    throw new Error("Unexpected AniList unread response");
  }
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
  siteUrl: httpUrlSchema.nullable().catch(null),
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
