import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { POP } from "@/lib/motion";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/BaseWidget";
import { getTaskData, useTasks, useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { Task } from "@/widgets/tasks/types";

const UNDO_MS = 6000;

export function ClearCompletedButton() {
  const instanceId = useWidgetInstanceId();
  const hasCompleted = useTasks((d) => d.tasks.some((task) => task.done));
  const clearCompleted = useTasksStore((s) => s.clearCompleted);
  const restoreTasks = useTasksStore((s) => s.restoreTasks);
  const [cleared, setCleared] = useState<Task[]>([]);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function handleClear() {
    const done = getTaskData(instanceId).tasks.filter((task) => task.done);
    clearCompleted(instanceId);
    setCleared((prev) => [...prev, ...done]);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCleared([]), UNDO_MS);
  }

  function handleUndo() {
    window.clearTimeout(timer.current);
    restoreTasks(instanceId, cleared);
    setCleared([]);
  }

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {cleared.length > 0 ? (
        <motion.div key="undo" {...POP}>
          <Tooltip
            content={`Restore ${cleared.length} cleared ${cleared.length === 1 ? "task" : "tasks"}`}
            sticky
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary h-7 rounded-sm px-2 text-xs font-semibold"
              onClick={handleUndo}
            >
              Undo
            </Button>
          </Tooltip>
        </motion.div>
      ) : hasCompleted ? (
        <motion.div key="clear" {...POP}>
          <Tooltip content="Clear completed" sticky>
            <Button
              variant="ghost"
              size="icon"
              className={WIDGET_HEADER_ACTION}
              aria-label="Clear completed tasks"
              onClick={handleClear}
            >
              <Eraser />
            </Button>
          </Tooltip>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
