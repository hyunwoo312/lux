import { useEffect, useRef } from "react";
import { getTaskData, useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { removeTaskWithUndo } from "@/widgets/tasks/lib/actions";
import type { TaskDraft } from "@/widgets/tasks/types";

const REMOVE_DELAY_MS = 900;

export function useTaskActions() {
  const instanceId = useWidgetInstanceId();
  const timers = useRef(new Map<string, number>());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);
  const cancel = (id: string) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  };
  const settle = (id: string) => {
    cancel(id);
    const data = getTaskData(instanceId);
    if (!data.removeOnCompletion || !data.tasks.find((task) => task.id === id)?.done) return;
    timers.current.set(
      id,
      window.setTimeout(() => {
        timers.current.delete(id);
        const current = getTaskData(instanceId);
        if (current.removeOnCompletion && current.tasks.find((task) => task.id === id)?.done)
          removeTaskWithUndo(instanceId, id);
      }, REMOVE_DELAY_MS),
    );
  };
  return {
    toggle: (id: string) => {
      useTasksStore.getState().toggleTask(instanceId, id);
      settle(id);
    },
    save: (id: string, draft: TaskDraft) => {
      const wasDone = getTaskData(instanceId).tasks.find((task) => task.id === id)?.done;
      useTasksStore.getState().saveTask(instanceId, id, draft);
      const done = getTaskData(instanceId).tasks.find((task) => task.id === id)?.done;
      if (done && !wasDone) settle(id);
      else if (!done) cancel(id);
    },
    remove: (id: string) => {
      cancel(id);
      removeTaskWithUndo(instanceId, id);
    },
  };
}
