import {
  Bookmark,
  CalendarClock,
  CheckCircle2,
  CircleSlash2,
  Flame,
  History,
  Library,
  PauseCircle,
  PlayCircle,
  Star,
  type LucideIcon,
} from "lucide-react";
import { listFilterLabel } from "@/widgets/anilist/lib/list-status";
import { LIST_FILTERS } from "@/widgets/anilist/types";
import type { CurrentSort, ListFilter, MediaFilter } from "@/widgets/anilist/types";
import type { FilterOption } from "@/widgets/anilist/components/FilterMenu";

export const MEDIA_FILTER_OPTIONS: { value: MediaFilter; label: string }[] = [
  { value: "both", label: "All" },
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
];

const SORT_LABELS: Record<CurrentSort, string> = {
  score: "Highest score",
  waiting: "Most behind",
  recent: "Recently updated",
  airing: "Airing soon",
};

const SORT_ORDER: CurrentSort[] = ["score", "waiting", "recent", "airing"];

const SORT_ICONS: Record<CurrentSort, LucideIcon> = {
  waiting: Flame,
  recent: History,
  score: Star,
  airing: CalendarClock,
};

const LIST_FILTER_ICONS: Record<ListFilter, LucideIcon> = {
  all: Library,
  progress: PlayCircle,
  planned: Bookmark,
  completed: CheckCircle2,
  paused: PauseCircle,
  dropped: CircleSlash2,
};

export function showsInProgress(listFilter: ListFilter): boolean {
  return listFilter === "progress" || listFilter === "all";
}

export function availableSorts(listFilter: ListFilter): FilterOption<CurrentSort>[] {
  return SORT_ORDER.filter((value) => value !== "waiting" || showsInProgress(listFilter)).map(
    (value) => ({ value, label: SORT_LABELS[value], icon: SORT_ICONS[value] }),
  );
}

export function resolveSort(sort: CurrentSort, listFilter: ListFilter): CurrentSort {
  return availableSorts(listFilter).some((option) => option.value === sort) ? sort : "score";
}

export function sortLabel(sort: CurrentSort): string {
  return SORT_LABELS[sort];
}

export function statusFilterOptions(media: MediaFilter): FilterOption<ListFilter>[] {
  return LIST_FILTERS.map((value) => ({
    value,
    label: listFilterLabel(value, media),
    icon: LIST_FILTER_ICONS[value],
  }));
}
