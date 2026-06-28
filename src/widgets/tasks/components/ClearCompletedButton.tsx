import { AnimatePresence, motion } from "motion/react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { POP } from "@/lib/motion";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/BaseWidget";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";

export function ClearCompletedButton() {
  const hasCompleted = useTasksStore((s) => s.tasks.some((task) => task.done));
  const clearCompleted = useTasksStore((s) => s.clearCompleted);

  return (
    <AnimatePresence initial={false}>
      {hasCompleted && (
        <motion.div key="clear" {...POP}>
          <Tooltip content="Clear completed" sticky>
            <Button
              variant="ghost"
              size="icon"
              className={WIDGET_HEADER_ACTION}
              aria-label="Clear completed tasks"
              onClick={clearCompleted}
            >
              <Eraser />
            </Button>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
