import type { SpotifyQueueItem } from "@/widgets/spotify/types";

export function dedupeUpNext(
  queue: SpotifyQueueItem[],
  currentTrackId: string | null,
): SpotifyQueueItem[] {
  const seen = new Set<string>();
  const upNext: SpotifyQueueItem[] = [];
  for (const item of queue) {
    if (item.id === currentTrackId || seen.has(item.id)) continue;
    seen.add(item.id);
    upNext.push(item);
  }
  return upNext;
}
