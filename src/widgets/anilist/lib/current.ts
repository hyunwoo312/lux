import type {
  CurrentEntry,
  CurrentSort,
  MediaKind,
  ScoreFormat,
  WaitingTotals,
} from "@/widgets/anilist/types";

export function sortCurrentEntries(entries: CurrentEntry[], sort: CurrentSort): CurrentEntry[] {
  const sorted = [...entries];
  if (sort === "recent") {
    sorted.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  } else if (sort === "score") {
    sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  } else {
    sorted.sort((a, b) => (b.behind ?? -1) - (a.behind ?? -1));
  }
  return sorted;
}

export function computeBehind(
  kind: MediaKind,
  progress: number,
  total: number | null,
  nextEpisode: number | null,
): number | null {
  const latestAvailable =
    kind === "anime" ? (nextEpisode != null ? nextEpisode - 1 : total) : total;
  if (latestAvailable == null) return null;
  return Math.max(0, latestAvailable - progress);
}

export function sumWaiting(entries: CurrentEntry[]): WaitingTotals {
  return entries.reduce<WaitingTotals>(
    (totals, entry) => {
      if (entry.behind == null || entry.behind <= 0) return totals;
      if (entry.kind === "anime") return { ...totals, episodes: totals.episodes + entry.behind };
      return { ...totals, chapters: totals.chapters + entry.behind };
    },
    { episodes: 0, chapters: 0 },
  );
}

export function progressLabel(entry: CurrentEntry): string {
  const unit = entry.kind === "anime" ? "Ep" : "Ch";
  const total = entry.total != null ? entry.total : "?";
  return `${unit} ${entry.progress}/${total}`;
}

export function formatScore(score: number, format: ScoreFormat): string | null {
  if (score <= 0) return null;
  switch (format) {
    case "POINT_100":
    case "POINT_10":
      return String(Math.round(score));
    case "POINT_10_DECIMAL":
      return score.toFixed(1);
    case "POINT_5":
      return `${Math.round(score)}★`;
    case "POINT_3":
      return score >= 3 ? "🙂" : score === 2 ? "😐" : "🙁";
  }
}

export function formatAiringIn(airingAt: number, now = Date.now()): string {
  const seconds = airingAt - Math.floor(now / 1000);
  if (seconds <= 0) return "now";
  const days = Math.floor(seconds / 86_400);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(seconds / 3_600);
  if (hours > 0) return `${hours}h`;
  return `${Math.max(1, Math.floor(seconds / 60))}m`;
}
