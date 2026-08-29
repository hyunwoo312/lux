import { motion } from "motion/react";
import { Video } from "lucide-react";
import { tap } from "@/lib/motion";
import { openUrl } from "@/lib/open-url";
import { cn } from "@/lib/utils";
import { GoogleCalendarServiceIcon, OutlookServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import type { CalendarProviderId, DisplayCalendarEvent } from "@/widgets/calendar/types";

type ActionSize = "sm" | "md";

type OpenLink = { provider: CalendarProviderId; sourceUrl: string };

const PROVIDER_META: Record<
  CalendarProviderId,
  { label: string; Icon: typeof GoogleCalendarServiceIcon; iconClass: Record<ActionSize, string> }
> = {
  google: {
    label: "Google Calendar",
    Icon: GoogleCalendarServiceIcon,
    iconClass: { sm: "size-4", md: "size-5" },
  },
  microsoft: {
    label: "Outlook",
    Icon: OutlookServiceIcon,
    iconClass: { sm: "size-4", md: "size-4" },
  },
};

const SIZES: Record<ActionSize, { gap: string; button: string; joinIcon: string }> = {
  sm: { gap: "gap-0.5", button: "size-5", joinIcon: "size-3.5" },
  md: { gap: "gap-1", button: "size-7", joinIcon: "size-4" },
};

const BUTTON = "focus-ring flex flex-none cursor-pointer items-center justify-center rounded-sm";

type CalendarEventActionsProps = {
  event: DisplayCalendarEvent;
  title: string;
  reduced: boolean | null;
  size: ActionSize;
  onColor?: boolean;
  className?: string;
};

export function CalendarEventActions({
  event,
  title,
  reduced,
  size,
  onColor = false,
  className,
}: CalendarEventActionsProps) {
  const joinUrl = event.joinUrl;
  const openLinks = event.links.filter((link): link is OpenLink => Boolean(link.sourceUrl));
  if (!joinUrl && openLinks.length === 0) return null;

  const scale = SIZES[size];
  const hover = onColor ? "hover:bg-black/15" : "hover:bg-foreground/10";

  return (
    <div className={cn("flex flex-none items-center", scale.gap, className)}>
      {joinUrl && (
        <Tooltip content="Join meeting">
          <motion.button
            type="button"
            {...tap(reduced, size === "sm" ? "glyph" : "control")}
            aria-label={`Join ${title}`}
            onClick={() => openUrl(joinUrl, "newTab")}
            className={cn(BUTTON, scale.button, hover, !onColor && "text-primary")}
          >
            <Video className={scale.joinIcon} aria-hidden />
          </motion.button>
        </Tooltip>
      )}
      {openLinks.map((link) => {
        const { label, Icon, iconClass } = PROVIDER_META[link.provider];
        return (
          <Tooltip key={link.provider} content={`Open in ${label}`}>
            <motion.button
              type="button"
              {...tap(reduced, size === "sm" ? "glyph" : "control")}
              aria-label={`Open ${title} in ${label}`}
              onClick={() => openUrl(link.sourceUrl, "newTab")}
              className={cn(BUTTON, scale.button, hover)}
            >
              <Icon className={iconClass[size]} />
            </motion.button>
          </Tooltip>
        );
      })}
    </div>
  );
}
