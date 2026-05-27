import { AnimatePresence, motion } from "motion/react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";

const pop = {
  initial: { opacity: 0, scale: 0.7 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.7 },
  transition: { duration: 0.18, ease: "easeOut" },
} as const;

export function ClearCompletedButton() {
  const hasCompleted = useTasksStore((s) => s.tasks.some((task) => task.done));
  const clearCompleted = useTasksStore((s) => s.clearCompleted);

  return (
    <AnimatePresence initial={false}>
      {hasCompleted && (
        <motion.div key="clear" {...pop}>
          <Tooltip content="Clear completed" sticky>
            <Button
              variant="ghost"
              size="icon"
              className="
                text-muted-foreground/60
                hover:text-foreground
                size-7 rounded-sm
                [&_svg]:size-4
              "
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
