import type { Release } from "@/widgets/github/types";

export function isUnseen(release: Release, lastSeenAt: string | undefined): boolean {
  if (!lastSeenAt) return false;
  const published = Date.parse(release.publishedAt);
  const seen = Date.parse(lastSeenAt);
  return Number.isFinite(published) && Number.isFinite(seen) && published > seen;
}

export function countUnseen(releases: Release[], lastSeenAt: string | undefined): number {
  return releases.filter((release) => isUnseen(release, lastSeenAt)).length;
}

export function newestPublishedAt(releases: Release[]): string | undefined {
  let newest: string | undefined;
  for (const release of releases) {
    const at = Date.parse(release.publishedAt);
    if (!Number.isFinite(at)) continue;
    if (!newest || at > Date.parse(newest)) newest = release.publishedAt;
  }
  return newest;
}
