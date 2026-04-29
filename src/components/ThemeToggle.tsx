import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
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
  );
}
