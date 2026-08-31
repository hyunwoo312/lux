import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccentStore } from "@/stores/useAccentStore";
import { ACCENT_LABELS, ACCENT_PRESETS, accentClass, type AccentName } from "@/widgets/core/accent";
import { SYSTEM_OWNER, type CommandItem } from "@/commands/items";
import type { WidgetIcon } from "@/widgets/core/types";
import { matchesQuery } from "@/widgets/core/commandResult";

const DOT = "bg-primary size-4 rounded-full shadow-[inset_0_1px_0_0_oklch(1_0_0/0.25)]";

function swatch(accent: AccentName): WidgetIcon {
  return function AccentSwatch({ className }) {
    return (
      <span aria-hidden className={cn(accentClass(accent), "grid place-items-center", className)}>
        <span className={DOT} />
      </span>
    );
  };
}

const SWATCHES: Record<AccentName, WidgetIcon> = {
  violet: swatch("violet"),
  indigo: swatch("indigo"),
  cyan: swatch("cyan"),
  teal: swatch("teal"),
  green: swatch("green"),
  rose: swatch("rose"),
  orange: swatch("orange"),
  yellow: swatch("yellow"),
};

export const accentCommand: CommandItem = {
  id: "action.setAccent",
  section: "commands",
  label: "Set accent colour",
  meta: SYSTEM_OWNER,
  icon: Palette,
  keywords: ["accent", "colour", "color", "highlight", "appearance", "theme"],
  effect: "scope",
  placeholder: "Choose an accent colour",
  emptyMessage: (query) => `No accent colour matched “${query}”.`,
  search: async (query) => {
    const needle = query.trim();
    const { accent, setAccent } = useAccentStore.getState();
    return ACCENT_PRESETS.filter((name) => matchesQuery(ACCENT_LABELS[name], needle)).map(
      (name) => ({
        id: `accent.${name}`,
        label: ACCENT_LABELS[name],
        meta: name === accent ? "Active" : undefined,
        section: "Accent colours",
        icon: SWATCHES[name],
        run: () => setAccent(name),
      }),
    );
  },
};
