import type { AccentPreset } from "@/widgets/core/accent";

export const TASKS_TINT: AccentPreset = "indigo";

export type Task = {
  id: string;
  title: string;
  done: boolean;
  description?: string;
  important?: boolean;
  todayKey?: string | null;
  subtasks?: Subtask[];
};

export type Subtask = { id: string; title: string; done: boolean };
export const TASK_VIEWS = ["all", "today", "completed"] as const;
export type TasksView = (typeof TASK_VIEWS)[number];
export const TASK_ORDERS = ["focus", "manual", "completion"] as const;
export type TasksOrder = (typeof TASK_ORDERS)[number];
export type TaskDraft = Pick<Task, "title" | "description" | "important" | "todayKey" | "subtasks">;

export type CompletedPosition = "top" | "bottom";
