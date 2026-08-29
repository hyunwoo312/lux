import { enterTween, exitTween, stagger, type Reduced } from "@/lib/motion";
import type { Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type AnimatedHeaderTextProps = {
  text: string;
  className?: string;
};

function groupVariants(reduced: Reduced): Variants {
  return {
    enter: { transition: { staggerChildren: stagger(reduced, "tight") } },
    exit: { transition: { staggerChildren: stagger(reduced, "micro") } },
  };
}

function characterVariants(reduced: Reduced): Variants {
  return {
    initial: { opacity: 0, x: -6 },
    enter: { opacity: 1, x: 0, transition: enterTween(reduced) },
    exit: { opacity: 0, x: 6, transition: exitTween(reduced) },
  };
}

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
          variants={groupVariants(reduced)}
          initial="initial"
          animate="enter"
          exit="exit"
        >
          {[...text].map((char, index) => (
            <motion.span
              key={`${index}-${char}`}
              className="inline-block whitespace-pre"
              variants={characterVariants(reduced)}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
