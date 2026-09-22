import { cn } from "@/lib/utils";
import { ART_SCRIM } from "@/widgets/core/chromeStyles";

export const COVER_GRID = "grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2";

export const COVER_SCRIM = cn(ART_SCRIM, "block px-1.5 pt-1 pb-1");
export const COVER_SCRIM_ACTIONS = "pb-8";

export const ART_ACTION_SHAPE =
  "flex h-6 items-center justify-center rounded-sm bg-on-art/15 text-on-art";
export const ART_ACTION = cn(
  ART_ACTION_SHAPE,
  "press focus-ring cursor-pointer hover:bg-on-art/30",
);
