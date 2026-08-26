import { motion } from "motion/react";
import { TAP } from "@/lib/motion";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleCalendarServiceIcon, OutlookServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import type { CalendarProviderId, DisplayCalendarEvent } from "@/widgets/calendar/types";

type OpenLink = { provider: CalendarProviderId; sourceUrl: string };

const PROVIDER_META: Record<
  CalendarProviderId,
  { label: string; Icon: typeof GoogleCalendarServiceIcon }
> = {
  google: { label: "Google Calendar", Icon: GoogleCalendarServiceIcon },
  microsoft: { label: "Outlook", Icon: OutlookServiceIcon },
};

const BUTTON = "focus-ring press flex size-5 flex-none items-center justify-center rounded-sm";

function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

type AgendaEventActionsProps = {
  event: DisplayCalendarEvent;
  title: string;
  reduced: boolean | null;
  onColor: boolean;
};

export function AgendaEventActions({ event, title, reduced, onColor }: AgendaEventActionsProps) {
  const joinUrl = event.joinUrl;
  const openLinks = event.links.filter((link): link is OpenLink => Boolean(link.sourceUrl));
  if (!joinUrl && openLinks.length === 0) return null;

  return (
    <div className="flex flex-none items-center gap-0.5">
      {joinUrl && (
        <Tooltip content="Join meeting">
          <motion.button
            type="button"
            {...(reduced ? {} : TAP.icon)}
            aria-label={`Join ${title}`}
            onClick={() => openUrl(joinUrl)}
            className={cn(
              BUTTON,
              onColor ? "hover:bg-black/15" : "text-primary hover:bg-foreground/10",
            )}
          >
            <Video className="size-3.5" aria-hidden />
          </motion.button>
        </Tooltip>
      )}
      {openLinks.map((link) => {
        const { label, Icon } = PROVIDER_META[link.provider];
        return (
          <Tooltip key={link.provider} content={`Open in ${label}`}>
            <motion.button
              type="button"
              {...(reduced ? {} : TAP.icon)}
              aria-label={`Open ${title} in ${label}`}
              onClick={() => openUrl(link.sourceUrl)}
              className={cn(BUTTON, onColor ? "hover:bg-black/15" : "hover:bg-foreground/10")}
            >
              <Icon className="size-4" />
            </motion.button>
          </Tooltip>
        );
      })}
    </div>
  );
}
