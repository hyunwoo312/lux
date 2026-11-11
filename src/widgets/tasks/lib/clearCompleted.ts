import { showToast } from "@/stores/useToastStore";
import { getTaskData, useTasksStore } from "@/widgets/tasks/useTasksStore";

export function clearCompletedWithUndo(instanceId: string): void {
  const tasks = getTaskData(instanceId).tasks;
  const done = tasks.filter((task) => task.done);
  if (done.length === 0) return;
  const positions = Object.fromEntries(tasks.map((task, index) => [task.id, index]));
  const { clearCompleted, restoreTasks } = useTasksStore.getState();
  clearCompleted(instanceId);
  showToast({
    key: `${instanceId}-cleared`,
    message: `${done.length} ${done.length === 1 ? "task" : "tasks"} cleared`,
    action: { kind: "undo", run: () => restoreTasks(instanceId, done, positions) },
  });
}
