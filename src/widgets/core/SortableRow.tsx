import { enterTween, exitTween } from "@/lib/motion";
import type { CSSProperties, ReactNode } from "react";
import { useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export function SortableRow({
  id,
  className,
  children,
}: {
  id: string;
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
  } = useSortable({ id, attributes: { role: "listitem" } });

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
        "focus-ring rounded-lg touch-none",
        isDragging ? "cursor-grabbing opacity-60" : "cursor-grab",
        className,
      )}
    >
      {children}
    </motion.li>
  );
}
