import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BorderTrail } from "@/components/ui/border-trail";
import { VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { orderTasks } from "@/widgets/tasks/lib/order";
import { getTaskData, useTasks, useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { DraftTaskRow, TaskRow } from "@/widgets/tasks/components/TaskRow";

const REMOVE_DELAY_MS = 900;

export function TasksWidget() {
  const instanceId = useWidgetInstanceId();
  const tasks = useTasks((d) => d.tasks);
  const autoSort = useTasks((d) => d.autoSort);
  const completedPosition = useTasks((d) => d.completedPosition);
  const removeOnCompletion = useTasks((d) => d.removeOnCompletion);
  const addTask = useTasksStore((s) => s.addTask);
  const toggleTask = useTasksStore((s) => s.toggleTask);
  const editTask = useTasksStore((s) => s.editTask);
  const removeTask = useTasksStore((s) => s.removeTask);
  const reorderTasks = useTasksStore((s) => s.reorderTasks);
  const reduced = useReducedMotion();

  const [newTitle, setNewTitle] = useState("");
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const pulse = useAnimationControls();
  const donePulse = useAnimationControls();
  const removalTimers = useRef(new Map<string, number>());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    const timers = removalTimers.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const ordered = useMemo(
    () => orderTasks(tasks, autoSort, completedPosition),
    [tasks, autoSort, completedPosition],
  );
  const hasDraft = newTitle.trim().length > 0;
  const showEmpty = ordered.length === 0 && !hasDraft;

  const cancelRemoval = (id: string) => {
    const timer = removalTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      removalTimers.current.delete(id);
    }
  };

  const handleToggle = (taskId: string) => {
    const before = getTaskData(instanceId).tasks;
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

    const allDoneNow = after.length > 0 && after.every((task) => task.done);
    const allDoneBefore = before.length > 0 && before.every((task) => task.done);
    if (!reduced && allDoneNow && !allDoneBefore) {
      donePulse.start({ scale: [1, 1.015, 1], transition: { duration: 0.32, ease: "easeOut" } });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTitle.trim()) return;

    addTask(instanceId, newTitle, draftId);
    if (!reduced) setRevealingId(draftId);
    setNewTitle("");
    setDraftId(crypto.randomUUID());
    if (!reduced) {
      pulse.start({ scale: [1, 1.015, 1], transition: { duration: 0.2, ease: "easeOut" } });
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
      <form onSubmit={handleSubmit} className="shrink-0">
        <div className="relative overflow-hidden rounded-lg">
          <motion.input
            animate={pulse}
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Add a task…"
            aria-label="Add a task"
            className="
              border-border/70 bg-background/60
              placeholder:text-muted-foreground/50
              focus-visible:border-ring
              relative w-full rounded-lg border px-3 py-2 text-sm outline-none
            "
          />
          {!reduced && <BorderTrail active={focused} />}
        </div>
      </form>
      {showEmpty ? (
        <div className="text-muted-foreground/60 flex flex-1 items-center justify-center text-sm">
          No tasks yet
        </div>
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
              className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto"
            >
              <AnimatePresence initial={false} mode="popLayout">
                {ordered.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    sortable={!autoSort}
                    revealing={task.id === revealingId}
                    onToggle={() => handleToggle(task.id)}
                    onEdit={(title) => editTask(instanceId, task.id, title)}
                    onRemove={() => removeTask(instanceId, task.id)}
                  />
                ))}
                {hasDraft && <DraftTaskRow key={draftId} text={newTitle} />}
              </AnimatePresence>
            </motion.ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
