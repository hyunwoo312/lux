import { SPRING_CRISP, SPRING_POP } from "@/lib/motion";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useAccentStore } from "@/stores/useAccentStore";
import { ACCENT_LABELS, ACCENT_PRESETS, accentClass } from "@/widgets/core/accent";

const SWATCH = "focus-ring relative grid size-7 cursor-pointer place-items-center rounded-full";

const DOT = "bg-primary size-5 rounded-full shadow-[inset_0_1px_0_0_oklch(1_0_0/0.25)]";

export function AccentPicker() {
  const accent = useAccentStore((s) => s.accent);
  const setAccent = useAccentStore((s) => s.setAccent);
  const reduced = useReducedMotion();

  return (
    <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap justify-end gap-1">
      {ACCENT_PRESETS.map((name) => {
        const selected = name === accent;
        return (
          <motion.button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={ACCENT_LABELS[name]}
            title={ACCENT_LABELS[name]}
            onClick={() => setAccent(name)}
            whileHover={reduced ? undefined : { scale: 1.12 }}
            whileTap={reduced ? undefined : { scale: 0.9 }}
            transition={SPRING_POP}
            className={cn(accentClass(name), SWATCH)}
          >
            {selected && (
              <motion.span
                layoutId="accent-ring"
                aria-hidden
                transition={reduced ? { duration: 0 } : SPRING_CRISP}
                className="border-foreground/80 absolute inset-0 rounded-full border-2"
              />
            )}
            <motion.span
              aria-hidden
              animate={{ scale: selected ? 0.78 : 1 }}
              transition={reduced ? { duration: 0 } : SPRING_CRISP}
              className={DOT}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
