import { enterTween, exitTween } from "@/lib/motion";
import { ROW } from "@/lib/row";
import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, X } from "lucide-react";
import { ItemActionButton } from "@/components/ItemActionButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Task } from "@/widgets/tasks/types";

type TaskRowProps = {
  task: Task;
  sortable: boolean;
  revealing: boolean;
  onRevealed: () => void;
  onToggle: () => void;
  onEdit: (title: string) => void;
  onRemove: () => void;
};

export function TaskRow({
  task,
  sortable,
  revealing,
  onRevealed,
  onToggle,
  onEdit,
  onRemove,
}: TaskRowProps) {
  const reduced = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const observer = useRef<ResizeObserver | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !sortable || editing,
    attributes: { role: "listitem", tabIndex: sortable ? 0 : -1 },
  });

  const rowRef = useCallback(
    (node: HTMLLIElement | null) => {
      setNodeRef(node);
      setActivatorNodeRef(node);
    },
    [setNodeRef, setActivatorNodeRef],
  );

  const measureRef = useCallback((node: HTMLSpanElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    const measure = () => setTruncated(node.scrollWidth > node.clientWidth);
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(node);
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

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
      ref={rowRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: enterTween(reduced) }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.95, transition: exitTween(reduced) }}
      className={cn(
        ROW.item,
        "focus-ring group relative",
        editing && "hover:bg-transparent",
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
        className="relative before:absolute before:-inset-1.5 before:content-['']"
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
            className="w-full bg-transparent text-body outline-none"
          />
        ) : (
          <Tooltip content={task.title} disabled={!truncated} side="top" align="start" prose>
            <span className="relative inline-block max-w-full align-middle">
              <span
                ref={measureRef}
                onDoubleClick={() => setEditing(true)}
                onAnimationEnd={() => {
                  if (revealing) onRevealed();
                }}
                className={cn(
                  "block truncate text-body",
                  task.done && "text-ink-3",
                  revealing && "task-reveal",
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
                transition={enterTween(reduced)}
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
          <ItemActionButton label={`Edit ${task.title}`} onClick={() => setEditing(true)}>
            <Pencil />
          </ItemActionButton>
          <ItemActionButton
            label={`Delete ${task.title}`}
            onClick={onRemove}
            className="hover:text-destructive"
          >
            <X />
          </ItemActionButton>
        </div>
      )}
    </motion.li>
  );
}
