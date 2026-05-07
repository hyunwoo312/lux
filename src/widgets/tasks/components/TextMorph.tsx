import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type TextMorphProps = {
  text: string;
  className?: string;
};

export function TextMorph({ text, className }: TextMorphProps) {
  const reduced = useReducedMotion();

  const chars = useMemo(() => {
    const counts: Record<string, number> = {};
    return Array.from(text).map((char) => {
      counts[char] = (counts[char] ?? 0) + 1;
      return { id: `${char}-${counts[char]}`, char };
    });
  }, [text]);

  if (reduced) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        {chars.map(({ id, char }) => (
          <motion.span
            key={id}
            layout
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="inline-block whitespace-pre"
          >
            {char}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}
