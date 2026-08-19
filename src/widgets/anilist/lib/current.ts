import type { CurrentEntry, CurrentSort, MediaKind, ScoreFormat } from "@/widgets/anilist/types";

export function sortCurrentEntries(entries: CurrentEntry[], sort: CurrentSort): CurrentEntry[] {
  const sorted = [...entries];
  if (sort === "airing") {
    sorted.sort(
      (a, b) => (a.nextEpisode?.airingAt ?? Infinity) - (b.nextEpisode?.airingAt ?? Infinity),
    );
  } else if (sort === "recent") {
    sorted.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  } else if (sort === "score") {
    sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  } else {
    sorted.sort((a, b) => (b.behind ?? -1) - (a.behind ?? -1));
  }
  return sorted;
}

export function dedupeEntries(entries: CurrentEntry[]): CurrentEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.kind}-${entry.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

export type AiringGroup = { key: string; label: string; entries: CurrentEntry[] };

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: "long" });

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function groupByAiringDay(entries: CurrentEntry[], now = Date.now()): AiringGroup[] {
  const today = new Date(now);
  const todayKey = dayKey(today);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dayKey(tomorrow);

  const groups: AiringGroup[] = [];
  const byKey = new Map<string, AiringGroup>();

  for (const entry of entries) {
    if (!entry.nextEpisode) continue;
    const airsAt = new Date(entry.nextEpisode.airingAt * 1000);
    const key = dayKey(airsAt);
    let group = byKey.get(key);
    if (!group) {
      const label =
        key === todayKey
          ? "Today"
          : key === tomorrowKey
            ? "Tomorrow"
            : WEEKDAY_FORMATTER.format(airsAt);
      group = { key, label, entries: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
  }

  return groups;
}
