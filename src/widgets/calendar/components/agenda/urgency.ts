import type { EventUrgency } from "@/widgets/calendar/lib/timeline";

export const URGENCY_RING: Record<EventUrgency, string | undefined> = {
  past: undefined,
  later: undefined,
  soon: "ring-primary/40 ring-1",
  now: "ring-primary/60 ring-2",
  imminent: "ring-primary ring-2",
};
