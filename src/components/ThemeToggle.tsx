import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useThemeStore } from "@/stores/useThemeStore";

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === "dark";

  return (
    <Tooltip content={isDark ? "Switch to light" : "Switch to dark"} sticky>
      <Button
        variant="ghost"
        size="icon"
        className="size-10 [&_svg]:size-5"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        onClick={toggle}
      >
        <Sun className="hidden dark:block" />
        <Moon className="dark:hidden" />
      </Button>
    </Tooltip>
  );
}
