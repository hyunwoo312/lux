import { motion } from "motion/react";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleCalendarServiceIcon, OutlookServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { EASE_OUT } from "@/lib/motion";
import {
  formatEventRelativeTime,
  formatEventTime,
  getEventStartDate,
  getEventTitle,
} from "@/widgets/calendar/lib/agenda";
import type { CalendarProviderId, DisplayCalendarEvent } from "@/widgets/calendar/types";

type OpenLink = { provider: CalendarProviderId; sourceUrl: string };

const PROVIDER_META: Record<
  CalendarProviderId,
  { label: string; Icon: typeof GoogleCalendarServiceIcon; iconClass: string }
> = {
  google: { label: "Google Calendar", Icon: GoogleCalendarServiceIcon, iconClass: "size-5" },
  microsoft: { label: "Outlook", Icon: OutlookServiceIcon, iconClass: "size-[17px]" },
};

const BASE_PR: Record<number, string> = { 1: "pr-9", 2: "pr-16", 3: "pr-24" };
const HOVER_PR: Record<number, string> = {
  1: "group-hover:pr-9 group-focus-within:pr-9",
  2: "group-hover:pr-16 group-focus-within:pr-16",
  3: "group-hover:pr-24 group-focus-within:pr-24",
};

const ACTION_BUTTON =
  "focus-ring flex size-7 cursor-pointer items-center justify-center rounded-sm";

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
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const title = getEventTitle(event);
  const startsInMs = getEventStartDate(event).getTime() - now.getTime();
  const imminent = startsInMs >= 0 && startsInMs <= 60 * 60_000;
  const relative = emphasized || imminent ? formatEventRelativeTime(event, now) : null;
  const openLinks = event.links.filter((link): link is OpenLink => Boolean(link.sourceUrl));
  const joinUrl = event.joinUrl;
  const needsResponse = event.rsvp === "needsAction";
  const declined = event.rsvp === "declined";
  const pinActions = Boolean(joinUrl) && imminent;
  const actionCount = openLinks.length + (joinUrl ? 1 : 0);
  const padCount = Math.min(3, actionCount) as 1 | 2 | 3;
  const padClass =
    actionCount === 0 ? undefined : pinActions || relative ? BASE_PR[padCount] : HOVER_PR[padCount];

  return (
    <motion.div
      layoutId={layoutId}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : 0.16,
        delay: reduced ? 0 : Math.min(index, 8) * 0.025,
        layout: { duration: reduced ? 0 : 0.32, ease: EASE_OUT },
      }}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
        "hover:bg-foreground/5",
        declined && "opacity-50",
      )}
    >
      <span
        aria-hidden
        className="size-2 flex-none rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-ink-3 w-12 flex-none text-micro font-semibold tabular-nums">
        {timeLabel ?? formatEventTime(event, !clock24h)}
      </span>
      <span
        className={cn("flex min-w-0 flex-1 flex-col transition-[padding] duration-200", padClass)}
      >
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span
            className={cn("text-ink truncate text-body font-medium", declined && "line-through")}
          >
            {title}
          </span>
          {needsResponse && (
            <Tooltip content="Needs your response">
              <span
                role="img"
                aria-label="Needs your response"
                className="border-primary size-1.5 shrink-0 rounded-full border"
              />
            </Tooltip>
          )}
        </span>
        {event.location && <span className="text-ink-3 truncate text-micro">{event.location}</span>}
      </span>
      {relative && !pinActions && (
        <span
          className={cn(
            `
              text-primary pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-micro
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
          className={cn(
            `
              absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1 transition
              duration-200
              motion-reduce:translate-x-0
              group-hover:translate-x-0 group-hover:opacity-100
              group-focus-within:translate-x-0 group-focus-within:opacity-100
            `,
            pinActions ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0",
          )}
        >
          {joinUrl && (
            <Tooltip content="Join meeting">
              <motion.button
                type="button"
                whileHover={reduced ? undefined : { scale: 1.18 }}
                whileTap={reduced ? undefined : { scale: 0.85 }}
                aria-label={`Join ${title}`}
                onClick={() => openUrl(joinUrl)}
                className={cn(ACTION_BUTTON, "text-primary")}
              >
                <Video className="size-4" aria-hidden />
              </motion.button>
            </Tooltip>
          )}
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
