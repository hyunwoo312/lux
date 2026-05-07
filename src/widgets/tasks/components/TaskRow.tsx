import type { KeyboardEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Transition } from "motion/react";
import { motion, useReducedMotion } from "motion/react";
import { Pencil, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { TextMorph } from "@/widgets/tasks/components/TextMorph";
import type { Task } from "@/widgets/tasks/types";

type TaskRowProps = {
  task?: Task;
  draftText?: string;
  revealing?: boolean;
  onToggle?: () => void;
  onEdit?: (title: string) => void;
  onRemove?: () => void;
};

const ROW_TRANSITION: Transition = {
  duration: 0.2,
  ease: "easeOut",
  layout: { duration: 0.25, ease: "easeOut" },
};

export function TaskRow({
  task,
  draftText = "",
  revealing = false,
  onToggle,
  onEdit,
  onRemove,
}: TaskRowProps) {
  const reduced = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [revealActive, setRevealActive] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => setLayoutReady(true), []);

  useLayoutEffect(() => {
    if (revealing) setRevealActive(true);
  }, [revealing]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (el && task && !editing && el.textContent !== task.title) el.textContent = task.title;
  }, [task, editing]);

  useEffect(() => {
    const el = textRef.current;
    if (editing && el) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [editing]);

  if (task === undefined) {
    return (
      <motion.li
        layout={layoutReady}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
        transition={ROW_TRANSITION}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
      >
        <span className="
          border-muted-foreground/40 size-4 shrink-0 rounded-[5px] border border-dashed
        " />
        <div className="min-w-0 flex-1">
          <TextMorph
            text={draftText}
            className="text-muted-foreground block overflow-hidden text-sm whitespace-nowrap"
          />
        </div>
      </motion.li>
    );
  }

  const cancel = () => {
    if (textRef.current) textRef.current.textContent = task.title;
    setEditing(false);
  };

  const commit = () => {
    const value = textRef.current?.textContent ?? "";
    if (!value.trim()) {
      cancel();
      return;
    }
    setEditing(false);
    onEdit?.(value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (!editing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  return (
    <motion.li
      layout={layoutReady}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: 8 }}
      transition={ROW_TRANSITION}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
        !editing && "hover:bg-foreground/5",
      )}
    >
      <Checkbox
        checked={task.done}
        disabled={editing}
        onCheckedChange={onToggle}
        aria-label={task.done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
      />
      <div
        className={cn(
          "min-w-0 flex-1 transition-[padding] duration-200",
          !editing && "group-hover:pr-12 group-focus-within:pr-12",
        )}
      >
        <span className="relative inline-block max-w-full align-middle">
          <span
            ref={textRef}
            contentEditable={editing}
            suppressContentEditableWarning
            role={editing ? "textbox" : undefined}
            aria-label={editing ? "Edit task" : undefined}
            onKeyDown={handleKeyDown}
            onBlur={editing ? commit : undefined}
            onAnimationEnd={() => {
              if (revealActive) setRevealActive(false);
            }}
            className={cn(
              "block text-sm outline-none",
              editing ? "whitespace-nowrap" : "truncate",
              !editing && task.done && "text-muted-foreground",
              revealActive && "task-reveal",
            )}
          />
          {!editing && (
            <motion.span
              aria-hidden
              className="
                bg-muted-foreground pointer-events-none absolute top-1/2 left-0 h-px w-full
                origin-left
              "
              initial={false}
              animate={{ scaleX: task.done ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
            />
          )}
        </span>
      </div>
      {!editing && (
        <div
          className="
            absolute top-1/2 right-2 flex -translate-y-1/2 translate-x-2 items-center gap-1
            opacity-0 transition duration-200
            group-focus-within:translate-x-0 group-focus-within:opacity-100
            group-hover:translate-x-0 group-hover:opacity-100
          "
        >
          <motion.button
            type="button"
            whileHover={reduced ? undefined : { scale: 1.18 }}
            whileTap={reduced ? undefined : { scale: 0.85 }}
            onClick={() => setEditing(true)}
            aria-label={`Edit ${task.title}`}
            className="
              text-muted-foreground/50
              hover:text-foreground
              cursor-pointer p-0.5 transition-colors
              [&_svg]:size-3.5
            "
          >
            <Pencil />
          </motion.button>
          <motion.button
            type="button"
            whileHover={reduced ? undefined : { scale: 1.18 }}
            whileTap={reduced ? undefined : { scale: 0.85 }}
            onClick={onRemove}
            aria-label={`Delete ${task.title}`}
            className="
              text-muted-foreground/50
              hover:text-destructive
              cursor-pointer p-0.5 transition-colors
              [&_svg]:size-3.5
            "
          >
            <X />
          </motion.button>
        </div>
      )}
    </motion.li>
  );
}
