import { cn } from "@/lib/utils";

export const COVER_GRID = "grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2";

export const ART_SCRIM = "art-scrim absolute inset-x-0 bottom-0 block px-1.5 pt-1 pb-1";
export const ART_SCRIM_ACTIONS = "pb-8";

export const ART_ACTION_SHAPE =
  "flex h-6 items-center justify-center rounded-sm bg-white/15 text-white";
export const ART_ACTION = cn(ART_ACTION_SHAPE, "press focus-ring cursor-pointer hover:bg-white/30");
