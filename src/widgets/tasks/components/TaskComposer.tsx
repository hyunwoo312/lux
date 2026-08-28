import type { FormEvent } from "react";
import { useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { Input } from "@/components/ui/input";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { BorderTrail } from "@/widgets/tasks/components/BorderTrail";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

type TaskComposerProps = {
  onAdded: (id: string) => void;
};

export function TaskComposer({ onAdded }: TaskComposerProps) {
  const instanceId = useWidgetInstanceId();
  const addTask = useTasksStore((s) => s.addTask);
  const reduced = useReducedMotion();
  const [title, setTitle] = useState("");
  const [focused, setFocused] = useState(false);
  const pulse = useAnimationControls();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;

    const id = crypto.randomUUID();
    addTask(instanceId, title, id);
    setTitle("");
    if (reduced) return;

    onAdded(id);
    pulse.start({
      scale: [1, 1.015, 1],
      transition: { duration: DURATION.base, ease: EASE_OUT },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="shrink-0">
      <motion.div animate={pulse} className="relative overflow-hidden rounded-md">
        <Input
          size="lg"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Add a task…"
          aria-label="Add a task"
        />
        <BorderTrail active={focused} />
      </motion.div>
    </form>
  );
}
