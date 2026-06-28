import { HEADER_LABEL } from "@/widgets/core/BaseWidget";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";

export function TasksStatus() {
  const tasks = useTasksStore((s) => s.tasks);
  if (tasks.length === 0) return <span className={HEADER_LABEL}>Tasks</span>;

  const done = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - done;

  return (
    <span className={HEADER_LABEL}>
      {done} done · {remaining} left
    </span>
  );
}
