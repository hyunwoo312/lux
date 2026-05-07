import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { BorderTrail } from "@/components/ui/border-trail";
import { orderTasks } from "@/widgets/tasks/lib/order";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";
import { TaskRow } from "@/widgets/tasks/components/TaskRow";

export function TasksWidget() {
  const tasks = useTasksStore((s) => s.tasks);
  const autoSort = useTasksStore((s) => s.autoSort);
  const completedPosition = useTasksStore((s) => s.completedPosition);
  const addTask = useTasksStore((s) => s.addTask);
  const toggleTask = useTasksStore((s) => s.toggleTask);
  const editTask = useTasksStore((s) => s.editTask);
  const removeTask = useTasksStore((s) => s.removeTask);
  const reduced = useReducedMotion();

  const [newTitle, setNewTitle] = useState("");
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const pulse = useAnimationControls();

  const ordered = useMemo(
    () => orderTasks(tasks, autoSort, completedPosition),
    [tasks, autoSort, completedPosition],
  );
  const hasDraft = newTitle.trim().length > 0;
  const showEmpty = ordered.length === 0 && !hasDraft;

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
              border-border/70 bg-background/40
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
        <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto">
          <AnimatePresence initial={false} mode="popLayout">
            {ordered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                revealing={task.id === revealingId}
                onToggle={() => toggleTask(task.id)}
                onEdit={(title) => editTask(task.id, title)}
                onRemove={() => removeTask(task.id)}
              />
            ))}
            {hasDraft && <TaskRow key={draftId} draftText={newTitle} />}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
