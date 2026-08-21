import { cn } from "@/lib/utils";

const ITEM = "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors";
const OPTION = "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-caption";
const INTERACT = "press-row focus-ring cursor-pointer";

export const ROW = {
  item: cn(ITEM, "hover:bg-foreground/5"),
  itemAction: cn(ITEM, INTERACT, "hover:bg-foreground/5"),
  option: cn(OPTION, INTERACT, "transition-colors hover:bg-accent"),
} as const;
