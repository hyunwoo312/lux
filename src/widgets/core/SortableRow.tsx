import { enterTween, exitTween } from "@/lib/motion";
import type { CSSProperties, ReactNode } from "react";
import { useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export function SortableRow({
  id,
  disabled = false,
  tabIndex,
  className,
  children,
}: {
  id: string;
  disabled?: boolean;
  tabIndex?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled, attributes: { role: "listitem", tabIndex } });

  const ref = useCallback(
    (node: HTMLLIElement | null) => {
      setNodeRef(node);
      setActivatorNodeRef(node);
    },
    [setNodeRef, setActivatorNodeRef],
  );

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <motion.li
      ref={ref}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: enterTween(reduced) }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.95, transition: exitTween(reduced) }}
      className={cn(
        "focus-ring rounded-lg",
        !disabled && "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-60",
        className,
      )}
    >
      {children}
    </motion.li>
  );
}
