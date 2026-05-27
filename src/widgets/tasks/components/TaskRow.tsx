import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Transition } from "motion/react";
import { motion, useReducedMotion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TextMorph } from "@/widgets/tasks/components/TextMorph";
import type { Task } from "@/widgets/tasks/types";

type TaskRowProps = {
  task: Task;
  sortable: boolean;
  revealing?: boolean;
  onToggle: () => void;
  onEdit: (title: string) => void;
  onRemove: () => void;
};

const ROW_TRANSITION: Transition = { duration: 0.2, ease: "easeOut" };

export function DraftTaskRow({ text }: { text: string }) {
  const reduced = useReducedMotion();

  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.5 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      transition={ROW_TRANSITION}
      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
    >
      <span className="
        border-muted-foreground/40 size-4 shrink-0 rounded-[5px] border border-dashed
      " />
      <div className="min-w-0 flex-1">
        <TextMorph
          text={text}
          className="text-muted-foreground block overflow-hidden text-sm whitespace-nowrap"
        />
      </div>
    </motion.li>
  );
}

export function TaskRow({ task, sortable, revealing = false, onToggle, onEdit, onRemove }: TaskRowProps) {
  const reduced = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [revealActive, setRevealActive] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const observer = useRef<ResizeObserver | null>(null);

  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !sortable || editing,
  });

  const measureRef = useCallback((node: HTMLSpanElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    const measure = () => setTruncated(node.scrollWidth > node.clientWidth);
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(node);
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

  useLayoutEffect(() => {
    if (revealing) setRevealActive(true);
  }, [revealing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const value = inputRef.current?.value ?? "";
    setEditing(false);
    if (value.trim()) onEdit(value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
    }
  };

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  const stopDrag = (event: { stopPropagation: () => void }) => event.stopPropagation();

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      {...listeners}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      transition={ROW_TRANSITION}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
        !editing && "hover:bg-foreground/5",
        sortable && "touch-none",
        sortable && !editing && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-60",
      )}
    >
      <Checkbox
        checked={task.done}
        disabled={editing}
        onPointerDown={stopDrag}
        onCheckedChange={onToggle}
        aria-label={task.done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
      />
      <div
        className={cn(
          "min-w-0 flex-1 transition-[padding] duration-200",
          !editing && "group-hover:pr-12 group-focus-within:pr-12",
        )}
      >
        {editing ? (
          <input
            ref={inputRef}
            defaultValue={task.title}
            onPointerDown={stopDrag}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            aria-label="Edit task"
            className="w-full bg-transparent text-sm outline-none"
          />
        ) : (
          <Tooltip content={task.title} disabled={!truncated} side="top" align="start" solid>
            <span className="relative inline-block max-w-full align-middle">
              <span
                ref={measureRef}
                onDoubleClick={() => setEditing(true)}
                onAnimationEnd={() => {
                  if (revealActive) setRevealActive(false);
                }}
                className={cn(
                  "block truncate text-sm",
                  task.done && "text-muted-foreground",
                  revealActive && "task-reveal",
                )}
              >
                {task.title}
              </span>
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
            </span>
          </Tooltip>
        )}
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
            onPointerDown={stopDrag}
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
            onPointerDown={stopDrag}
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
