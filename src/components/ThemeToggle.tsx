import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { pop } from "@/lib/motion";
import type { RovingItemProps } from "@/hooks/useRovingFocus";
import { useThemeStore } from "@/stores/useThemeStore";

export function ThemeToggle(roving: RovingItemProps) {
  const reduced = useReducedMotion();
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === "dark";

  return (
    <Tooltip content={isDark ? "Switch to light" : "Switch to dark"} sticky>
      <Button
        {...roving}
        variant="ghost"
        size="icon-lg"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        onClick={toggle}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "dark" : "light"}
            className="grid place-items-center"
            {...pop(reduced)}
          >
            {isDark ? <Sun /> : <Moon />}
          </motion.span>
        </AnimatePresence>
      </Button>
    </Tooltip>
  );
}
