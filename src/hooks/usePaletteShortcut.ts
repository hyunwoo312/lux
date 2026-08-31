import { useEffect, useState } from "react";
import { OPEN_PALETTE_COMMAND } from "@/lib/extension-keys";

export function usePaletteShortcut(): string | undefined {
  const [shortcut, setShortcut] = useState<string>();

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.commands) return;
    void chrome.commands.getAll().then((commands) => {
      const bound = commands.find((command) => command.name === OPEN_PALETTE_COMMAND)?.shortcut;
      setShortcut(bound === "" ? undefined : bound);
    });
  }, []);

  return shortcut;
}
