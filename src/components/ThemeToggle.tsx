import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { POP } from "@/lib/motion";
import { useThemeStore } from "@/stores/useThemeStore";

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const ref = useRef<HTMLButtonElement>(null);
  const isDark = theme === "dark";

  const handleClick = () => {
    const rect = ref.current?.getBoundingClientRect();
    toggle(rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <Tooltip content={isDark ? "Switch to light" : "Switch to dark"} sticky>
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className="size-10 [&_svg]:size-5"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        onClick={handleClick}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={isDark ? "dark" : "light"} className="grid place-items-center" {...POP}>
            {isDark ? <Sun /> : <Moon />}
          </motion.span>
        </AnimatePresence>
      </Button>
    </Tooltip>
  );
}
