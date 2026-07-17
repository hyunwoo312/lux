import { HEADER_LABEL } from "@/widgets/core/BaseWidget";
import { useTasks } from "@/widgets/tasks/useTasksStore";

export function TasksStatus() {
  const tasks = useTasks((d) => d.tasks);
  if (tasks.length === 0) return <span className={HEADER_LABEL}>Tasks</span>;

  const done = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - done;

  return (
    <div className="flex flex-col gap-1">
      <span className={HEADER_LABEL}>
        {done} done · {remaining} left
      </span>
      <span
        className="bg-foreground/10 relative block h-0.5 w-full overflow-hidden rounded-full"
        aria-hidden
      >
        <span
          className="
            bg-primary absolute inset-y-0 left-0 w-full origin-left rounded-full
            transition-transform duration-300 ease-out
          "
          style={{ transform: `scaleX(${done / tasks.length})` }}
        />
      </span>
    </div>
  );
}
