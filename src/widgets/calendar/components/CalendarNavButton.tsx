import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { WidgetIcon } from "@/widgets/core/types";

export function CalendarNavButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: WidgetIcon;
  onClick: () => void;
}) {
  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="icon-xs"
        className={cn(WIDGET_HEADER_ACTION, "size-6 [&_svg]:size-3.5")}
        aria-label={label}
        onClick={onClick}
      >
        <Icon />
      </Button>
    </Tooltip>
  );
}

export function TodayButton() {
  const instanceId = useWidgetInstanceId();
  const goToToday = useCalendarStore((s) => s.goToToday);

  return (
    <CalendarNavButton
      label="Go to today"
      icon={CalendarClock}
      onClick={() => goToToday(instanceId)}
    />
  );
}
