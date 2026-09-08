import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { pop } from "@/lib/motion";
import { showToast } from "@/stores/useToastStore";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
import { getTaskData, useTasks, useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function ClearCompletedButton() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const hasCompleted = useTasks((d) => d.tasks.some((task) => task.done));
  const clearCompleted = useTasksStore((s) => s.clearCompleted);
  const restoreTasks = useTasksStore((s) => s.restoreTasks);

  function handleClear() {
    const done = getTaskData(instanceId).tasks.filter((task) => task.done);
    clearCompleted(instanceId);
    showToast({
      key: `${instanceId}-cleared`,
      message: `${done.length} ${done.length === 1 ? "task" : "tasks"} cleared`,
      action: { kind: "undo", run: () => restoreTasks(instanceId, done) },
    });
  }

  return (
    <AnimatePresence initial={false}>
      {hasCompleted && (
        <motion.div key="clear" {...pop(reduced)}>
          <Tooltip content="Clear completed" sticky>
            <Button
              variant="ghost"
              size="icon-xs"
              className={WIDGET_HEADER_ACTION}
              aria-label="Clear completed tasks"
              onClick={handleClear}
            >
              <Eraser />
            </Button>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
