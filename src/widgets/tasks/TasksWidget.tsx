import { DURATION, EASE_OUT } from "@/lib/motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ListChecks } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";
import { useSortableSensors, VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { orderTasks } from "@/widgets/tasks/lib/order";
import { getTaskData, useTasks, useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { TaskComposer } from "@/widgets/tasks/components/TaskComposer";
import { TaskRow } from "@/widgets/tasks/components/TaskRow";

const REMOVE_DELAY_MS = 900;

export function TasksWidget() {
  const instanceId = useWidgetInstanceId();
  const tasks = useTasks((d) => d.tasks);
  const autoSort = useTasks((d) => d.autoSort);
  const completedPosition = useTasks((d) => d.completedPosition);
  const removeOnCompletion = useTasks((d) => d.removeOnCompletion);
  const toggleTask = useTasksStore((s) => s.toggleTask);
  const editTask = useTasksStore((s) => s.editTask);
  const removeTask = useTasksStore((s) => s.removeTask);
  const reorderTasks = useTasksStore((s) => s.reorderTasks);
  const reduced = useReducedMotion();

  const [revealingId, setRevealingId] = useState<string | null>(null);
  const donePulse = useAnimationControls();
  const removalTimers = useRef(new Map<string, number>());

  const sensors = useSortableSensors();

  useEffect(() => {
    const timers = removalTimers.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const ordered = useMemo(
    () => orderTasks(tasks, autoSort, completedPosition),
    [tasks, autoSort, completedPosition],
  );
  const showEmpty = ordered.length === 0;

  const cancelRemoval = (id: string) => {
    const timer = removalTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      removalTimers.current.delete(id);
    }
  };

  const handleToggle = (taskId: string) => {
    toggleTask(instanceId, taskId);
    const after = getTaskData(instanceId).tasks;
    const toggled = after.find((task) => task.id === taskId);

    if (removeOnCompletion && toggled?.done) {
      cancelRemoval(taskId);
      const timer = window.setTimeout(() => {
        removalTimers.current.delete(taskId);
        removeTask(instanceId, taskId);
      }, REMOVE_DELAY_MS);
      removalTimers.current.set(taskId, timer);
      return;
    }
    if (!toggled?.done) cancelRemoval(taskId);

    if (!reduced && after.length > 0 && after.every((task) => task.done)) {
      donePulse.start({
        scale: [1, 1.015, 1],
        transition: { duration: DURATION.slow, ease: EASE_OUT },
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderTasks(instanceId, String(active.id), String(over.id));
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <TaskComposer onAdded={setRevealingId} />
      {showEmpty ? (
        <StateMessage icon={ListChecks} message="No tasks yet" />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={VERTICAL_LIST_MODIFIERS}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={ordered.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <motion.ul
              animate={donePulse}
              className="
                flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden scroll-fade overflow-y-auto
              "
            >
              <AnimatePresence initial={false} mode="popLayout">
                {ordered.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    sortable={!autoSort}
                    revealing={task.id === revealingId}
                    onRevealed={() => setRevealingId(null)}
                    onToggle={() => handleToggle(task.id)}
                    onEdit={(title) => editTask(instanceId, task.id, title)}
                    onRemove={() => removeTask(instanceId, task.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
