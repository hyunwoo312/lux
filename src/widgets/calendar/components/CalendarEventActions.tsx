import { Video } from "lucide-react";
import { openUrl } from "@/lib/open-url";
import { cn } from "@/lib/utils";
import { GoogleCalendarServiceIcon, OutlookServiceIcon } from "@/components/icons/service-icons";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  CALENDAR_PROVIDER_LABEL,
  type CalendarProviderId,
  type DisplayCalendarEvent,
} from "@/widgets/calendar/types";

type ActionSize = "sm" | "md";

type OpenLink = { provider: CalendarProviderId; sourceUrl: string };

const PROVIDER_ICON: Record<
  CalendarProviderId,
  { Icon: typeof GoogleCalendarServiceIcon; className: Record<ActionSize, string> }
> = {
  google: { Icon: GoogleCalendarServiceIcon, className: { sm: "size-4", md: "size-5" } },
  microsoft: { Icon: OutlookServiceIcon, className: { sm: "size-4", md: "size-4" } },
};

const SIZES: Record<ActionSize, { gap: string; button: string }> = {
  sm: { gap: "gap-0.5", button: "size-5 [&_svg]:size-3.5" },
  md: { gap: "gap-1", button: "" },
};

type CalendarEventActionsProps = {
  event: DisplayCalendarEvent;
  title: string;
  size: ActionSize;
  onColor?: boolean;
  className?: string;
};

export function CalendarEventActions({
  event,
  title,
  size,
  onColor = false,
  className,
}: CalendarEventActionsProps) {
  const joinUrl = event.joinUrl;
  const openLinks = event.links.filter((link): link is OpenLink => Boolean(link.sourceUrl));
  if (!joinUrl && openLinks.length === 0) return null;

  const scale = SIZES[size];
  const button = cn(scale.button, onColor && "hover:bg-black/15 hover:text-current");

  return (
    <div className={cn("flex flex-none items-center", scale.gap, className)}>
      {joinUrl && (
        <Tooltip content="Join meeting">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Join ${title}`}
            onClick={() => openUrl(joinUrl, "newTab")}
            className={cn(button, !onColor && "text-primary hover:text-primary")}
          >
            <Video aria-hidden />
          </Button>
        </Tooltip>
      )}
      {openLinks.map((link) => {
        const label = CALENDAR_PROVIDER_LABEL[link.provider];
        const { Icon, className: iconClass } = PROVIDER_ICON[link.provider];
        return (
          <Tooltip key={link.provider} content={`Open in ${label}`}>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Open ${title} in ${label}`}
              onClick={() => openUrl(link.sourceUrl, "newTab")}
              className={button}
            >
              <Icon className={iconClass[size]} />
            </Button>
          </Tooltip>
        );
      })}
    </div>
  );
}
