import type { AccentPreset } from "@/widgets/core/accent";

export const TASKS_ACCENT: AccentPreset = "indigo";

export type Task = {
  id: string;
  title: string;
  done: boolean;
};

export type CompletedPosition = "top" | "bottom";
