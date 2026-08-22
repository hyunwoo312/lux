import { z } from "zod";
import { computeBehind, dedupeEntries } from "@/widgets/anilist/lib/current";
import {
  DEFAULT_SCORE_FORMAT,
  MEDIA_FRAGMENT,
  anilistGraphQL,
  mediaSchema,
  pickTitle,
  type MediaNode,
} from "@/widgets/anilist/lib/api/client";
import {
  ANILIST_MAX_LIBRARY_ITEMS,
  LIST_STATUSES,
  SCORE_FORMATS,
  type CurrentData,
  type CurrentEntry,
  type ListStatus,
  type MediaKind,
  type TitleLanguage,
} from "@/widgets/anilist/types";

const LIST_QUERY = `query ($userId: Int!, $status: [MediaListStatus]) {
  Viewer { mediaListOptions { scoreFormat } }
  anime: MediaListCollection(userId: $userId, type: ANIME, status_in: $status) {
    lists { entries { status progress score updatedAt media { ...mediaFields } } }
  }
  manga: MediaListCollection(userId: $userId, type: MANGA, status_in: $status) {
    lists { entries { status progress score updatedAt media { ...mediaFields } } }
  }
}
${MEDIA_FRAGMENT}`;

const collectionSchema = z
  .object({
    lists: z.array(
      z.object({
        entries: z.array(
          z.object({
            status: z.enum(LIST_STATUSES).nullable(),
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
    coverImage: media.coverImage?.large ?? undefined,
    coverImageSmall: media.coverImage?.medium ?? undefined,
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
      return built ? [{ ...built, status: entry.status ?? undefined }] : [];
    }),
  );
}

export async function fetchList(
  userId: number,
  lang: TitleLanguage,
  signal?: AbortSignal,
): Promise<CurrentData> {
  if (!Number.isFinite(userId)) {
    throw new Error("AniList account is missing an id");
  }
  const parsed = currentSchema.safeParse(
    await anilistGraphQL(LIST_QUERY, { userId, status: LIST_STATUSES }, true, signal),
  );
  if (!parsed.success) {
    throw new Error("Unexpected AniList list response");
  }
  const entries = dedupeEntries([
    ...collectEntries("anime", parsed.data.data.anime, lang),
    ...collectEntries("manga", parsed.data.data.manga, lang),
  ]).slice(0, ANILIST_MAX_LIBRARY_ITEMS);
  const scoreFormat =
    parsed.data.data.Viewer?.mediaListOptions?.scoreFormat ?? DEFAULT_SCORE_FORMAT;
  return { entries, scoreFormat };
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

const SAVE_STATUS_MUTATION = `mutation ($mediaId: Int!, $status: MediaListStatus!) {
  SaveMediaListEntry(mediaId: $mediaId, status: $status) { id status }
}`;

const saveStatusSchema = z.object({
  data: z.object({
    SaveMediaListEntry: z.object({ status: z.enum(LIST_STATUSES).nullable() }).nullable(),
  }),
});

export async function saveListStatus(
  mediaId: number,
  status: ListStatus,
  signal?: AbortSignal,
): Promise<ListStatus> {
  const parsed = saveStatusSchema.safeParse(
    await anilistGraphQL(SAVE_STATUS_MUTATION, { mediaId, status }, true, signal),
  );
  if (!parsed.success || !parsed.data.data.SaveMediaListEntry) {
    throw new Error("Couldn't update your list");
  }
  return parsed.data.data.SaveMediaListEntry.status ?? status;
}
