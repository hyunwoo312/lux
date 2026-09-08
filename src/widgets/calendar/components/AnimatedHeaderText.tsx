import { listVariants, rowVariants } from "@/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type AnimatedHeaderTextProps = {
  text: string;
  className?: string;
};

export function AnimatedHeaderText({ text, className }: AnimatedHeaderTextProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <span className={cn("block truncate", className)}>{text}</span>;
  }

  return (
    <span className={cn("relative block overflow-hidden", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          className="inline-block whitespace-pre"
          variants={listVariants(reduced, "tight")}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          {[...text].map((char, index) => (
            <motion.span
              key={`${index}-${char}`}
              className="inline-block whitespace-pre"
              variants={rowVariants(reduced)}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
