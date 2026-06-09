import type { ComponentType } from "react";
import {
  CircleHelp,
  Grid3x3,
  LayoutGrid,
  Settings,
  SquarePlus,
  SunMoon,
} from "lucide-react";
import type { Shortcut } from "@/lib/shortcuts";

const ctrl = (key: string): Shortcut => ({ mod: true, shift: false, alt: false, key });
const ctrlShift = (key: string): Shortcut => ({ mod: true, shift: true, alt: false, key });

export type ShortcutDefinition = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly defaults: readonly Shortcut[];
};

export const SHORTCUT_DEFINITIONS = [
  { id: "openSettings", label: "Open settings", description: "Open this dialog", icon: Settings, defaults: [ctrl(",")] },
  { id: "openHelp", label: "Open help", description: "Guides, shortcuts, and FAQ", icon: CircleHelp, defaults: [ctrlShift("h")] },
  { id: "toggleTheme", label: "Toggle theme", description: "Switch between light and dark", icon: SunMoon, defaults: [ctrlShift("l")] },
  { id: "editLayout", label: "Edit layout", description: "Rearrange and resize widgets", icon: LayoutGrid, defaults: [ctrl("e")] },
  { id: "addWidget", label: "Add widget", description: "Open the widget palette", icon: SquarePlus, defaults: [ctrlShift("a")] },
  { id: "toggleGridLines", label: "Grid lines", description: "Toggle the dashboard grid overlay", icon: Grid3x3, defaults: [ctrl("g")] },
] as const satisfies readonly ShortcutDefinition[];

export type ShortcutAction = (typeof SHORTCUT_DEFINITIONS)[number]["id"];

export const SHORTCUT_DEFAULTS = Object.fromEntries(
  SHORTCUT_DEFINITIONS.map((definition) => [definition.id, definition.defaults.map((s) => ({ ...s }))]),
) as Record<ShortcutAction, Shortcut[]>;
