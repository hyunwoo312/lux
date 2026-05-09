import { useTasksStore } from "@/widgets/tasks/useTasksStore";

const LABEL = "text-muted-foreground block truncate text-xs font-medium tracking-wide uppercase";

export function TasksStatus() {
  const tasks = useTasksStore((s) => s.tasks);
  if (tasks.length === 0) return <span className={LABEL}>Tasks</span>;

  const done = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - done;

  return (
    <span className={LABEL}>
      {done} done · {remaining} left
    </span>
  );
}
