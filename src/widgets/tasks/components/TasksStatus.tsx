import { useTasksStore } from "@/widgets/tasks/useTasksStore";

export function TasksStatus() {
  const tasks = useTasksStore((s) => s.tasks);
  if (tasks.length === 0) return <span>Tasks</span>;

  const done = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - done;

  return (
    <span>
      {done} done · {remaining} left
    </span>
  );
}
