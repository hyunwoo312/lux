import type { Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type AnimatedHeaderTextProps = {
  text: string;
  className?: string;
};

const group: Variants = {
  enter: { transition: { staggerChildren: 0.025 } },
  exit: { transition: { staggerChildren: 0.015 } },
};

const character: Variants = {
  initial: { opacity: 0, x: -6 },
  enter: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 6 },
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
          variants={group}
          initial="initial"
          animate="enter"
          exit="exit"
        >
          {[...text].map((char, index) => (
            <motion.span
              key={`${index}-${char}`}
              className="inline-block whitespace-pre"
              variants={character}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
