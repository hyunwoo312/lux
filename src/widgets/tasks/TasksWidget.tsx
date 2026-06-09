import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BorderTrail } from "@/components/ui/border-trail";
import { orderTasks } from "@/widgets/tasks/lib/order";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";
import { DraftTaskRow, TaskRow } from "@/widgets/tasks/components/TaskRow";

const REMOVE_DELAY_MS = 900;

export function TasksWidget() {
  const tasks = useTasksStore((s) => s.tasks);
  const autoSort = useTasksStore((s) => s.autoSort);
  const completedPosition = useTasksStore((s) => s.completedPosition);
  const removeOnCompletion = useTasksStore((s) => s.removeOnCompletion);
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

  const handleToggle = (id: string) => {
    const before = useTasksStore.getState().tasks;
    toggleTask(id);
    const after = useTasksStore.getState().tasks;
    const toggled = after.find((task) => task.id === id);

    if (removeOnCompletion && toggled?.done) {
      cancelRemoval(id);
      const timer = window.setTimeout(() => {
        removalTimers.current.delete(id);
        removeTask(id);
      }, REMOVE_DELAY_MS);
      removalTimers.current.set(id, timer);
      return;
    }
    if (!toggled?.done) cancelRemoval(id);

    const allDoneNow = after.length > 0 && after.every((task) => task.done);
    const allDoneBefore = before.length > 0 && before.every((task) => task.done);
    if (!reduced && allDoneNow && !allDoneBefore) {
      donePulse.start({ scale: [1, 1.015, 1], transition: { duration: 0.32, ease: "easeOut" } });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTitle.trim()) return;

    addTask(newTitle, draftId);
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
      reorderTasks(String(active.id), String(over.id));
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                    onEdit={(title) => editTask(task.id, title)}
                    onRemove={() => removeTask(task.id)}
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
