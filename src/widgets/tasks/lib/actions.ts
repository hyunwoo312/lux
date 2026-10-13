import { showToast } from "@/stores/useToastStore";
import { getTaskData, useTasksStore } from "@/widgets/tasks/useTasksStore";

export function removeTaskWithUndo(instanceId: string, id: string): void {
  const tasks = getTaskData(instanceId).tasks;
  const index = tasks.findIndex((task) => task.id === id);
  const task = tasks[index];
  if (!task) return;
  useTasksStore.getState().removeTask(instanceId, id);
  showToast({
    key: `${instanceId}-removed-${id}`,
    message: `Removed “${task.title}”`,
    action: {
      kind: "undo",
      run: () => useTasksStore.getState().restoreTasks(instanceId, [task], { [id]: index }),
    },
  });
}
