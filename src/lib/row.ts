import { cn } from "@/lib/utils";

const ITEM = "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors";
const OPTION = "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-caption";
const INTERACT = "press-row focus-ring cursor-pointer";
const REVEAL = `
  translate-x-2 opacity-0 transition duration-base
  group-hover:translate-x-0 group-hover:opacity-100
  group-focus-within:translate-x-0 group-focus-within:opacity-100
`;

export const ROW = {
  item: cn(ITEM, "hover:bg-foreground/5"),
  itemAction: cn(ITEM, INTERACT, "hover:bg-foreground/5"),
  option: cn(OPTION, INTERACT, "transition-colors hover:bg-accent"),
  reveal: cn(REVEAL),
  revealTrailing: cn(REVEAL, "absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1"),
  revealPad: "transition-[padding,background-color] duration-base",
} as const;
