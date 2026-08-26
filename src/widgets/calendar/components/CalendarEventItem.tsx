import { motion } from "motion/react";
import { ROW } from "@/lib/row";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleCalendarServiceIcon, OutlookServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { EASE_OUT, TAP } from "@/lib/motion";
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

const ACTION_BUTTON = "focus-ring flex cursor-pointer items-center justify-center rounded-sm";

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
  const hasActions = openLinks.length > 0 || Boolean(joinUrl);

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
      className={cn(ROW.item, "group", declined && "opacity-50")}
    >
      <span
        aria-hidden
        className="size-2 flex-none rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-ink-3 w-12 flex-none text-micro font-semibold tabular-nums">
        {timeLabel ?? formatEventTime(event, !clock24h)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
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
        <span className="text-primary flex-none text-micro font-semibold tabular-nums">
          {relative}
        </span>
      )}
      {hasActions && (
        <div
          className={cn(
            `
              flex flex-none items-center gap-1 transition-opacity duration-200
              group-hover:opacity-100
              group-focus-within:opacity-100
            `,
            pinActions ? "opacity-100" : "opacity-60",
          )}
        >
          {joinUrl && (
            <Tooltip content="Join meeting">
              <motion.button
                type="button"
                {...(reduced ? {} : TAP.icon)}
                aria-label={`Join ${title}`}
                onClick={() => openUrl(joinUrl)}
                className={cn(ACTION_BUTTON, "size-7", "text-primary")}
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
                  {...(reduced ? {} : TAP.icon)}
                  aria-label={`Open ${title} in ${label}`}
                  onClick={() => openUrl(link.sourceUrl)}
                  className={cn(ACTION_BUTTON, "size-7")}
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
