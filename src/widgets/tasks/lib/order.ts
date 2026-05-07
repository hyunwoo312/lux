import type { CompletedPosition, Task } from "@/widgets/tasks/types";

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
