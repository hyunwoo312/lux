import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { GoogleCalendarServiceIcon, OutlookServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { formatEventRelativeTime, formatEventTime, getEventTitle } from "@/widgets/calendar/lib/agenda";
import type { CalendarProviderId, DisplayCalendarEvent } from "@/widgets/calendar/types";

type OpenLink = { provider: CalendarProviderId; sourceUrl: string };

const PROVIDER_META: Record<
  CalendarProviderId,
  { label: string; Icon: typeof GoogleCalendarServiceIcon; iconClass: string }
> = {
  google: { label: "Google Calendar", Icon: GoogleCalendarServiceIcon, iconClass: "size-5" },
  microsoft: { label: "Outlook", Icon: OutlookServiceIcon, iconClass: "size-[17px]" },
};

const BASE_PR: Record<number, string> = { 1: "pr-9", 2: "pr-16" };
const HOVER_PR: Record<number, string> = {
  1: "group-hover:pr-9 group-focus-within:pr-9",
  2: "group-hover:pr-16 group-focus-within:pr-16",
};

const ACTION_BUTTON =
  "flex size-7 items-center justify-center rounded-md outline-none focus-visible:ring-foreground/30 focus-visible:ring-2";

function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

type CalendarEventItemProps = {
  event: DisplayCalendarEvent;
  index: number;
  color: string;
  now: Date;
  emphasized?: boolean;
  timeLabel?: string;
  reduced: boolean | null;
  layoutId?: string;
};

export function CalendarEventItem({
  event,
  index,
  color,
  now,
  emphasized = false,
  timeLabel,
  reduced,
  layoutId,
}: CalendarEventItemProps) {
  const title = getEventTitle(event);
  const relative = emphasized ? formatEventRelativeTime(event, now) : null;
  const openLinks = event.links.filter((link): link is OpenLink => Boolean(link.sourceUrl));
  const actionCount = openLinks.length;
  const padCount = Math.min(2, actionCount) as 1 | 2;
  const padClass =
    actionCount === 0 ? undefined : relative ? BASE_PR[padCount] : HOVER_PR[padCount];

  return (
    <motion.div
      layoutId={layoutId}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : 0.16,
        delay: reduced ? 0 : Math.min(index, 8) * 0.025,
        layout: { duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] },
      }}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
        "hover:bg-foreground/[0.05]",
      )}
    >
      <span aria-hidden className="size-2 flex-none rounded-full" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground w-12 flex-none text-2xs font-semibold tabular-nums">
        {timeLabel ?? formatEventTime(event)}
      </span>
      <span className={cn("flex min-w-0 flex-1 flex-col transition-[padding] duration-200", padClass)}>
        <span className="text-foreground truncate text-sm font-medium">{title}</span>
        {event.location && (
          <span className="text-muted-foreground truncate text-2xs">{event.location}</span>
        )}
      </span>
      {relative && (
        <span
          className={cn(
            `
              text-primary pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-2xs
              font-semibold tabular-nums
            `,
            actionCount > 0 &&
              "transition-opacity duration-200 group-hover:opacity-0 group-focus-within:opacity-0",
          )}
        >
          {relative}
        </span>
      )}
      {actionCount > 0 && (
        <div
          className="
            absolute top-1/2 right-2 flex -translate-y-1/2 translate-x-2 items-center gap-1
            opacity-0 transition duration-200
            motion-reduce:translate-x-0
            group-hover:translate-x-0 group-hover:opacity-100
            group-focus-within:translate-x-0 group-focus-within:opacity-100
          "
        >
          {openLinks.map((link) => {
            const { label, Icon, iconClass } = PROVIDER_META[link.provider];
            return (
              <Tooltip key={link.provider} content={`Open in ${label}`}>
                <motion.button
                  type="button"
                  whileHover={reduced ? undefined : { scale: 1.18 }}
                  whileTap={reduced ? undefined : { scale: 0.85 }}
                  aria-label={`Open ${title} in ${label}`}
                  onClick={() => openUrl(link.sourceUrl)}
                  className={ACTION_BUTTON}
                >
                  <Icon className={iconClass} />
                </motion.button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
