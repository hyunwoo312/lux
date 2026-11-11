import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { pop } from "@/lib/motion";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
import { clearCompletedWithUndo } from "@/widgets/tasks/lib/clearCompleted";
import { useTasks } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function ClearCompletedButton() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const hasCompleted = useTasks((d) => d.tasks.some((task) => task.done));

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
              onClick={() => clearCompletedWithUndo(instanceId)}
            >
              <Eraser />
            </Button>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
