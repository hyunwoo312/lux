import type { ListFilter, ListStatus, MediaFilter } from "@/widgets/anilist/types";

const FILTER_STATUSES: Record<ListFilter, ListStatus[]> = {
  all: ["CURRENT", "REPEATING", "PLANNING", "COMPLETED", "PAUSED", "DROPPED"],
  progress: ["CURRENT", "REPEATING"],
  planned: ["PLANNING"],
  completed: ["COMPLETED"],
  paused: ["PAUSED"],
  dropped: ["DROPPED"],
};

export function isInProgressStatus(status: ListStatus): boolean {
  return FILTER_STATUSES.progress.includes(status);
}

export function statusesFor(filter: ListFilter): ListStatus[] {
  return FILTER_STATUSES[filter];
}

export function listFilterLabel(filter: ListFilter, media: MediaFilter): string {
  if (filter === "all") return "All";
  if (filter !== "progress") {
    return { planned: "Planned", completed: "Completed", paused: "Paused", dropped: "Dropped" }[
      filter
    ];
  }
  if (media === "anime") return "Watching";
  if (media === "manga") return "Reading";
  return "In progress";
}

export function emptyListMessage(filter: ListFilter): string {
  if (filter === "all") return "Your list is empty.";
  if (filter === "planned") return "Nothing planned yet — add titles from Discover.";
  if (filter === "completed") return "Nothing finished yet.";
  if (filter === "paused") return "Nothing on hold.";
  if (filter === "dropped") return "Nothing dropped.";
  return "Nothing in progress.";
}
