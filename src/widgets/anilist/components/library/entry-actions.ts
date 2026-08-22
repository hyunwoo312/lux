import { PlayCircle, RotateCcw, type LucideIcon } from "lucide-react";
import type { CurrentEntry } from "@/widgets/anilist/types";

type EntryFacts = Pick<CurrentEntry, "kind" | "status" | "title">;

export type PromoteAction = {
  icon: LucideIcon;
  tooltip: string;
  label: string;
};

export function promoteAction({ kind, status, title }: EntryFacts): PromoteAction {
  const gerund = kind === "anime" ? "watching" : "reading";

  switch (status) {
    case "PLANNING":
      return { icon: PlayCircle, tooltip: `Start ${gerund}`, label: `Start ${gerund} ${title}` };
    case "PAUSED":
      return { icon: PlayCircle, tooltip: `Resume ${gerund}`, label: `Resume ${gerund} ${title}` };
    case "DROPPED":
      return { icon: RotateCcw, tooltip: "Pick back up", label: `Pick ${title} back up` };
    case "COMPLETED": {
      const again = kind === "anime" ? "Rewatch" : "Reread";
      return { icon: RotateCcw, tooltip: again, label: `${again} ${title}` };
    }
    default:
      return { icon: PlayCircle, tooltip: "Start", label: `Start ${title}` };
  }
}

export function stepLabels({ kind, title }: Pick<CurrentEntry, "kind" | "title">) {
  const unit = kind === "anime" ? "episode" : "chapter";
  return {
    increment: { tooltip: `Mark next ${unit}`, label: `Mark next ${unit} of ${title}` },
    decrement: { tooltip: `Unmark last ${unit}`, label: `Unmark last ${unit} of ${title}` },
  };
}

export function progressSpeech({
  kind,
  progress,
  total,
}: Pick<CurrentEntry, "kind" | "progress" | "total">): string {
  const units = kind === "anime" ? "episodes" : "chapters";
  const consumed = kind === "anime" ? "watched" : "read";
  return total != null
    ? `${progress} of ${total} ${units} ${consumed}`
    : `${progress} ${units} ${consumed}`;
}
