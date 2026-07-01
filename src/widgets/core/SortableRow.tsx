import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

const ROW_TRANSITION = { duration: 0.2, ease: "easeOut" } as const;

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
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

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
        "touch-none",
        isDragging ? "cursor-grabbing opacity-60" : "cursor-grab",
        className,
      )}
    >
      {children}
    </motion.li>
  );
}
