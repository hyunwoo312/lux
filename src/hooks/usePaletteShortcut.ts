import { useEffect, useState } from "react";
import { OPEN_PALETTE_COMMAND } from "@/lib/extension-keys";

type PaletteShortcut =
  | { status: "loading" }
  | { status: "unbound" }
  | { status: "bound"; shortcut: string };

const canReadCommands = () => typeof chrome !== "undefined" && chrome.commands !== undefined;

export function usePaletteShortcut(): PaletteShortcut {
  const [state, setState] = useState<PaletteShortcut>(() =>
    canReadCommands() ? { status: "loading" } : { status: "unbound" },
  );

  useEffect(() => {
    if (!canReadCommands()) return;
    void chrome.commands.getAll().then((commands) => {
      const bound = commands.find((command) => command.name === OPEN_PALETTE_COMMAND)?.shortcut;
      setState(bound ? { status: "bound", shortcut: bound } : { status: "unbound" });
    });
  }, []);

  return state;
}
