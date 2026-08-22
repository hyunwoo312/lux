import { z } from "zod";
import { ensureOk, withTimeout } from "@/lib/net";
import { integrationFetch } from "@/integrations";
import type { ScoreFormat, TitleLanguage } from "@/widgets/anilist/types";

export type Page<T> = { items: T[]; hasNextPage: boolean };

export const DEFAULT_SCORE_FORMAT: ScoreFormat = "POINT_10";

const ENDPOINT = "https://graphql.anilist.co";

export const TITLE_SELECTION = "title { romaji english native }";

export const titleSchema = z
  .object({
    romaji: z.string().nullable(),
    english: z.string().nullable(),
    native: z.string().nullable(),
  })
  .nullable();

export function pickTitle(title: z.infer<typeof titleSchema>, lang: TitleLanguage): string | null {
  if (!title) return null;
  return title[lang] ?? title.romaji ?? title.english ?? title.native ?? null;
}

export async function anilistGraphQL(
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
    : await fetch(ENDPOINT, { ...init, signal: withTimeout(signal) });
  ensureOk(response, "AniList request failed");
  return response.json();
}

export const MEDIA_FRAGMENT = `fragment mediaFields on Media {
  id
  type
  ${TITLE_SELECTION}
  coverImage { medium large color }
  episodes
  chapters
  format
  siteUrl
  nextAiringEpisode { episode airingAt }
}`;

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const mediaSchema = z.object({
  id: z.number(),
  type: z.enum(["ANIME", "MANGA"]).nullable(),
  title: titleSchema,
  coverImage: z
    .object({
      medium: z.string().nullish(),
      large: z.string().nullable(),
      color: z.string().regex(HEX_COLOR).nullable().catch(null),
    })
    .nullable(),
  episodes: z.number().nullable(),
  chapters: z.number().nullable(),
  format: z.string().nullable(),
  siteUrl: z.string().nullable(),
  nextAiringEpisode: z.object({ episode: z.number(), airingAt: z.number() }).nullable(),
});

export type MediaNode = z.infer<typeof mediaSchema>;
