import {
  BookOpen,
  MessageSquarePlus,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react";

type ToolbarGroup = { icons: LucideIcon[]; ring: string; badge: string };

export const TOOLBAR_GROUPS: ToolbarGroup[] = [
  { icons: [Sun], ring: "ring-info/60", badge: "bg-info/15 text-info" },
  { icons: [Plus], ring: "ring-success/60", badge: "bg-success/15 text-success" },
  { icons: [Pencil], ring: "ring-warning/60", badge: "bg-warning/15 text-warning" },
  { icons: [Search], ring: "ring-ink-3/50", badge: "bg-foreground/10 text-ink-2" },
  {
    icons: [Settings, ScrollText, BookOpen, MessageSquarePlus],
    ring: "ring-primary/60",
    badge: "bg-primary/15 text-primary",
  },
];

export const TOOLBAR_ICON_COUNT = TOOLBAR_GROUPS.reduce(
  (total, group) => total + group.icons.length,
  0,
);
