import { z } from "zod";
import { buildDiscoverVariables } from "@/widgets/anilist/lib/discover";
import {
  MEDIA_FRAGMENT,
  anilistGraphQL,
  mediaSchema,
  pickTitle,
} from "@/widgets/anilist/lib/api/client";
import {
  LIST_STATUSES,
  type DiscoverFeed,
  type DiscoverMedia,
  type DiscoverType,
  type TitleLanguage,
} from "@/widgets/anilist/types";

const PAGE_SIZE = 30;

const DISCOVER_SELECTION = `...mediaFields
      averageScore
      genres
      mediaListEntry { status }`;

const DISCOVER_QUERY = `query (
  $type: MediaType!
  $sort: [MediaSort]
  $season: MediaSeason
  $seasonYear: Int
  $status: MediaStatus
) {
  Page(page: 1, perPage: ${PAGE_SIZE}) {
    media(
      sort: $sort
      type: $type
      season: $season
      seasonYear: $seasonYear
      status: $status
      isAdult: false
    ) {
      ${DISCOVER_SELECTION}
    }
  }
}
${MEDIA_FRAGMENT}`;

const SEARCH_QUERY = `query ($search: String!, $type: MediaType!) {
  Page(page: 1, perPage: ${PAGE_SIZE}) {
    media(search: $search, type: $type, sort: [SEARCH_MATCH], isAdult: false) {
      ${DISCOVER_SELECTION}
    }
  }
}
${MEDIA_FRAGMENT}`;

const discoverWireSchema = mediaSchema.extend({
  averageScore: z.number().nullable().optional(),
  genres: z.array(z.string()).nullable().optional(),
  mediaListEntry: z
    .object({ status: z.enum(LIST_STATUSES).nullable() })
    .nullable()
    .optional(),
});

const discoverSchema = z.object({
  data: z.object({ Page: z.object({ media: z.array(discoverWireSchema) }).nullable() }),
});

type DiscoverWire = z.infer<typeof discoverWireSchema>;

function toDiscoverMedia(
  media: DiscoverWire,
  lang: TitleLanguage,
  type: DiscoverType,
): DiscoverMedia[] {
  const title = pickTitle(media.title, lang);
  if (!title || !media.siteUrl) return [];
  return [
    {
      id: media.id,
      kind: type,
      title,
      coverImage: media.coverImage?.large ?? undefined,
      coverImageSmall: media.coverImage?.medium ?? undefined,
      coverColor: media.coverImage?.color ?? undefined,
      format: media.format ?? undefined,
      siteUrl: media.siteUrl,
      averageScore: media.averageScore ?? undefined,
      genres: media.genres?.slice(0, 2) ?? undefined,
      episodes: media.episodes ?? undefined,
      listStatus: media.mediaListEntry?.status ?? undefined,
    },
  ];
}

async function fetchDiscoverPage(
  query: string,
  variables: Record<string, unknown>,
  lang: TitleLanguage,
  type: DiscoverType,
  authed: boolean,
  signal?: AbortSignal,
): Promise<DiscoverMedia[]> {
  const parsed = discoverSchema.safeParse(await anilistGraphQL(query, variables, authed, signal));
  if (!parsed.success) {
    throw new Error("Unexpected AniList discover response");
  }
  return parsed.data.data.Page?.media.flatMap((media) => toDiscoverMedia(media, lang, type)) ?? [];
}

export async function fetchDiscover(
  lang: TitleLanguage,
  feed: DiscoverFeed,
  type: DiscoverType,
  authed: boolean,
  signal?: AbortSignal,
): Promise<DiscoverMedia[]> {
  return fetchDiscoverPage(
    DISCOVER_QUERY,
    buildDiscoverVariables(feed, type, new Date()),
    lang,
    type,
    authed,
    signal,
  );
}

export async function searchDiscover(
  lang: TitleLanguage,
  query: string,
  type: DiscoverType,
  authed: boolean,
  signal?: AbortSignal,
): Promise<DiscoverMedia[]> {
  return fetchDiscoverPage(
    SEARCH_QUERY,
    { search: query, type: type === "manga" ? "MANGA" : "ANIME" },
    lang,
    type,
    authed,
    signal,
  );
}
