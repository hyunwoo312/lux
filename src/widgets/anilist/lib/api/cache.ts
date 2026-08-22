import { z } from "zod";
import { DEFAULT_SCORE_FORMAT, HEX_COLOR } from "@/widgets/anilist/lib/api/client";
import {
  LIST_STATUSES,
  SCORE_FORMATS,
  type AnilistActivity,
  type AnilistNotification,
  type CurrentData,
  type DiscoverMedia,
} from "@/widgets/anilist/types";

const coverColorSchema = z.string().regex(HEX_COLOR).optional().catch(undefined);

function tolerantArray<T>(entrySchema: z.ZodType<T>) {
  return z
    .unknown()
    .transform((raw): T[] => {
      if (!Array.isArray(raw)) return [];
      return raw.flatMap((entry) => {
        const parsed = entrySchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      });
    })
    .default([]);
}

const currentEntrySchema = z.object({
  id: z.number(),
  kind: z.enum(["anime", "manga"]),
  title: z.string(),
  coverImage: z.string().optional(),
  coverImageSmall: z.string().optional(),
  coverColor: coverColorSchema,
  siteUrl: z.string(),
  progress: z.number(),
  total: z.number().nullable(),
  behind: z.number().nullable(),
  nextEpisode: z.object({ episode: z.number(), airingAt: z.number() }).optional(),
  score: z.number().optional(),
  updatedAt: z.number().optional(),
  status: z.enum(LIST_STATUSES).optional(),
});

const currentDataSchema = z.object({
  entries: tolerantArray(currentEntrySchema),
  scoreFormat: z.enum(SCORE_FORMATS).catch(DEFAULT_SCORE_FORMAT).default(DEFAULT_SCORE_FORMAT),
});

const discoverMediaSchema = z.object({
  id: z.number(),
  kind: z.enum(["anime", "manga"]),
  title: z.string(),
  coverImage: z.string().optional(),
  coverImageSmall: z.string().optional(),
  coverColor: coverColorSchema,
  format: z.string().optional(),
  siteUrl: z.string(),
  averageScore: z.number().optional(),
  genres: z.array(z.string()).optional(),
  episodes: z.number().optional(),
  listStatus: z.enum(LIST_STATUSES).optional(),
});

const notificationSchema = z.object({
  id: z.number(),
  text: z.string(),
  createdAt: z.string(),
  imageUrl: z.string().optional(),
  imageKind: z.enum(["cover", "avatar"]).optional(),
  url: z.string().optional(),
});

const activitySchema = z.object({
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

const discoverListSchema = tolerantArray(discoverMediaSchema);
const inboxListSchema = tolerantArray(notificationSchema);
const activityListSchema = tolerantArray(activitySchema);

export function parseCachedCurrent(raw: unknown): CurrentData | null {
  const result = currentDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseCachedDiscover(raw: unknown): DiscoverMedia[] | null {
  if (!Array.isArray(raw)) return null;
  const result = discoverListSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseCachedInbox(raw: unknown): AnilistNotification[] | null {
  if (!Array.isArray(raw)) return null;
  const result = inboxListSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseCachedActivity(raw: unknown): AnilistActivity[] | null {
  if (!Array.isArray(raw)) return null;
  const result = activityListSchema.safeParse(raw);
  return result.success ? result.data : null;
}
