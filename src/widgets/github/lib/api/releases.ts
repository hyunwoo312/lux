import { z } from "zod";
import { tolerantArray } from "@/lib/persist";
import { graphql } from "@/widgets/github/lib/api/client";
import type { Release, ReleasesData } from "@/widgets/github/types";

const WATCHED_REPO_LIMIT = 100;

const RELEASES_QUERY = `query {
  viewer {
    watching(first: ${WATCHED_REPO_LIMIT}, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        nameWithOwner
        isPrivate
        latestRelease { name tagName url publishedAt isPrerelease }
      }
    }
  }
}`;

const watchedRepoSchema = z.object({
  nameWithOwner: z.string(),
  isPrivate: z.boolean(),
  latestRelease: z
    .object({
      name: z.string().nullable(),
      tagName: z.string(),
      url: z.string(),
      publishedAt: z.string().nullable(),
      isPrerelease: z.boolean(),
    })
    .nullable(),
});

const watchingSchema = z.object({
  data: z.object({
    viewer: z.object({
      watching: z.object({
        totalCount: z.number(),
        nodes: z.array(z.unknown()),
      }),
    }),
  }),
});

function toRelease(repo: z.infer<typeof watchedRepoSchema>): Release | null {
  const release = repo.latestRelease;
  if (!release?.publishedAt) return null;
  return {
    repo: repo.nameWithOwner,
    isPrivate: repo.isPrivate,
    name: release.name?.trim() || release.tagName,
    tagName: release.tagName,
    url: release.url,
    publishedAt: release.publishedAt,
    isPrerelease: release.isPrerelease,
  };
}

export async function fetchReleases(signal?: AbortSignal): Promise<ReleasesData> {
  const parsed = watchingSchema.safeParse(await graphql(RELEASES_QUERY, signal));
  if (!parsed.success) {
    throw new Error("Unexpected GitHub releases response");
  }
  const { totalCount, nodes } = parsed.data.data.viewer.watching;
  const releases = nodes
    .map((node) => watchedRepoSchema.safeParse(node))
    .flatMap((result) => (result.success ? [result.data] : []))
    .map(toRelease)
    .filter((release): release is Release => release !== null)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return { releases, watchedCount: totalCount, watchedScanned: nodes.length };
}

const cachedReleaseSchema = z.object({
  repo: z.string(),
  isPrivate: z.boolean(),
  name: z.string(),
  tagName: z.string(),
  url: z.string(),
  publishedAt: z.string(),
  isPrerelease: z.boolean().catch(false),
});

const cachedReleasesSchema = z.object({
  releases: tolerantArray(cachedReleaseSchema),
  watchedCount: z.number(),
  watchedScanned: z.number(),
});

export function parseCachedReleases(raw: unknown): ReleasesData | null {
  const result = cachedReleasesSchema.safeParse(raw);
  return result.success ? result.data : null;
}
