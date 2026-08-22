import { motion } from "motion/react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { URGENCY_RING } from "@/widgets/calendar/components/agenda/urgency";
import { EASE_OUT } from "@/lib/motion";
import { AgendaEventActions } from "@/widgets/calendar/components/agenda/AgendaEventActions";
import { getEventTitle } from "@/widgets/calendar/lib/agenda";
import { getReadableTextColor } from "@/widgets/calendar/lib/colors";
import { formatTimeRange, type EventUrgency } from "@/widgets/calendar/lib/timeline";
import type { DisplayCalendarEvent } from "@/widgets/calendar/types";

const LINE_PX = 16;
const LINE_GAP_PX = 1;
const BLOCK_PADDING_PX = 8;

function linesThatFit(height: number): number {
  const usable = height - BLOCK_PADDING_PX + LINE_GAP_PX;
  return Math.max(1, Math.floor(usable / (LINE_PX + LINE_GAP_PX)));
}

type AgendaEventBlockProps = {
  event: DisplayCalendarEvent;
  color: string;
  urgency: EventUrgency;
  countdown: string | null;
  conflicting: boolean;
  hour12: boolean;
  index: number;
  reduced: boolean | null;
  top: number;
  height: number;
  left: number;
  width: number;
};

export function AgendaEventBlock({
  event,
  color,
  urgency,
  countdown,
  conflicting,
  hour12,
  index,
  reduced,
  top,
  height,
  left,
  width,
}: AgendaEventBlockProps) {
  const title = getEventTitle(event);
  const range = formatTimeRange(event, hour12);
  const ink = getReadableTextColor(color);
  const declined = event.rsvp === "declined";
  const lines = linesThatFit(height);
  const showRange = lines >= 2;
  const showLocation = lines >= 3 && Boolean(event.location);
  const actionCount = (event.joinUrl ? 1 : 0) + event.links.filter((link) => link.sourceUrl).length;
  const chromeWidth = actionCount * 22 + (countdown ? 34 : 0) + 8;

  const surface = (
    <span
      className={cn(
        "flex size-full min-w-0 flex-col gap-px overflow-hidden rounded-md px-1.5 py-1 text-left",
        declined && "opacity-60",
      )}
      style={{ backgroundColor: color, color: ink }}
    >
      <span className="flex min-w-0 items-center gap-1" style={{ paddingRight: chromeWidth }}>
        {conflicting && <TriangleAlert className="size-3 flex-none opacity-90" aria-hidden />}
        <span className={cn("truncate text-micro font-semibold", declined && "line-through")}>
          {title}
        </span>
      </span>
      <span className="sr-only">
        {range}
        {conflicting ? ", overlaps another event" : ""}
        {declined ? ", declined" : ""}
      </span>
      {showRange && (
        <span aria-hidden className="truncate text-micro tabular-nums opacity-80">
          {range}
        </span>
      )}
      {showLocation && (
        <span aria-hidden className="truncate text-micro opacity-75">
          {event.location}
        </span>
      )}
    </span>
  );

  return (
    <motion.li
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: reduced ? 0 : 0.18,
        delay: reduced ? 0 : Math.min(index, 8) * 0.02,
        ease: EASE_OUT,
      }}
      style={{ top, height, left: `${left}%`, width: `${width}%` }}
      className="absolute pr-0.5"
    >
      <span className={cn("relative block size-full rounded-md", URGENCY_RING[urgency])}>
        {surface}
        <span
          className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-0.5"
          style={{ color: ink }}
        >
          {countdown && (
            <span
              className="
                bg-primary text-primary-foreground rounded-sm px-1 text-micro font-semibold
                tabular-nums
              "
            >
              {countdown}
            </span>
          )}
          <AgendaEventActions event={event} title={title} reduced={reduced} onColor />
        </span>
      </span>
    </motion.li>
  );
}
