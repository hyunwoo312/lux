import { useState } from "react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next, true);
    setTheme(next);
  }

  return { theme, toggle };
}
