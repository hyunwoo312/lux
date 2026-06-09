import { cn } from "@/lib/utils";
import type { QuickAccessView } from "@/widgets/quick-access/types";

export const QA_GRID_CONTAINER = "grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1";
export const QA_LIST_CONTAINER = "flex flex-col gap-0.5";

export const QA_REVEAL =
  "scale-90 opacity-0 transition duration-200 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100";

export function qaItemGeometry(view: QuickAccessView): string {
  return view === "grid"
    ? "flex flex-col items-center gap-1.5 rounded-lg p-2"
    : "flex items-center gap-2.5 rounded-md px-2 py-1.5";
}

export function qaTileClass(view: QuickAccessView): string {
  return cn(
    qaItemGeometry(view),
    "hover:bg-foreground/5 w-full cursor-pointer transition-colors",
    view === "list" && "text-left",
  );
}
