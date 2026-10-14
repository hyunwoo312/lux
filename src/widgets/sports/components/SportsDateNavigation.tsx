import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SportsDateCalendar } from "@/widgets/sports/components/SportsDateCalendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { localDayKey } from "@/lib/clock";
import { useNow } from "@/hooks/useNow";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useSportsDate } from "@/widgets/sports/hooks/useSportsDate";
import { SportsDayRange } from "@/widgets/sports/components/SportsDayRange";
import { useSportsViewStore } from "@/widgets/sports/useSportsViewStore";

export function SportsDateNavigation() {
  const id = useWidgetInstanceId();
  const date = useSportsDate();
  const [open, setOpen] = useState(false);
  const now = useNow();
  const today = localDayKey(now);
  const value = localDayKey(date);
  const shift = (at: Date, days: number) => {
    const next = new Date(at);
    next.setDate(next.getDate() + days);
    return localDayKey(next);
  };
  const min = shift(now, -7),
    max = shift(now, 7);
  const setDate = (next: string) => {
    if (next >= min && next <= max && /^\d{4}-\d{2}-\d{2}$/.test(next))
      useSportsViewStore.getState().setView(id, { date: next === today ? null : next });
  };
  return (
    <div className="flex shrink-0 items-center">
      <Tooltip content="Previous day">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Previous day"
          disabled={value <= min}
          onClick={() => setDate(shift(date, -1))}
        >
          <ChevronLeft />
        </Button>
      </Tooltip>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="xs" aria-label="Choose sports date">
            <CalendarDays />
            {value === today
              ? "Today"
              : date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          padding="panel"
          className="w-64 space-y-2"
          align="end"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <SportsDateCalendar
            date={date}
            min={min}
            max={max}
            today={today}
            onSelect={(value) => {
              setDate(value);
              setOpen(false);
            }}
          />
          <Button
            variant="ghost"
            size="xs"
            className="w-full"
            onClick={() => {
              useSportsViewStore.getState().setView(id, { date: null });
              setOpen(false);
            }}
          >
            Return to today
          </Button>
        </PopoverContent>
      </Popover>
      <Tooltip content="Next day">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Next day"
          disabled={value >= max}
          onClick={() => setDate(shift(date, 1))}
        >
          <ChevronRight />
        </Button>
      </Tooltip>
      <SportsDayRange compact />
    </div>
  );
}
