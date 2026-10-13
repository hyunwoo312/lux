import type { CompletedPosition, Task, TasksOrder, TasksView } from "@/widgets/tasks/types";

export function orderTasks(
  tasks: readonly Task[],
  autoSort: boolean,
  completedPosition: CompletedPosition,
): Task[] {
  if (!autoSort) return [...tasks];
  const doneRank = completedPosition === "bottom" ? 1 : 0;
  const rank = (task: Task) => (task.done ? doneRank : 1 - doneRank);
  return [...tasks].sort((a, b) => rank(a) - rank(b));
}

export function visibleTasks(
  tasks: readonly Task[],
  view: TasksView,
  day: string,
  order: TasksOrder,
  completedPosition: CompletedPosition,
  showCompleted: boolean,
  query: string,
  importantOnly: boolean,
): Task[] {
  const search = query.trim().toLocaleLowerCase();
  const shown = tasks.filter(
    (task) =>
      (view !== "today" || task.todayKey === day) &&
      (view === "completed" ? task.done : showCompleted || !task.done) &&
      (!importantOnly || task.important) &&
      `${task.title} ${task.description ?? ""} ${task.subtasks?.map((child) => child.title).join(" ") ?? ""}`
        .toLocaleLowerCase()
        .includes(search),
  );
  if (order === "completion") return orderTasks(shown, true, completedPosition);
  if (order === "focus")
    shown.sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        Number(Boolean(b.important)) - Number(Boolean(a.important)),
    );
  return shown;
}
