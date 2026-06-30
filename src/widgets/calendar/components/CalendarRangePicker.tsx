import type { CSSProperties } from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCENT_PRESETS } from "@/widgets/core/accent";
import { ConfigSegmented } from "@/components/config/WidgetConfig";
import {
  addDays,
  getDateKey,
  getMonthGridDays,
  getMonthOffset,
  startOfDay,
} from "@/widgets/calendar/lib/dates";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const monthTitleFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const LOOKAHEAD_OPTIONS = [
  { value: "1", label: "Today" },
  { value: "3", label: "3 days" },
  { value: "7", label: "Week" },
  { value: "14", label: "2 weeks" },
];

function lookaheadValue(days: number): string {
  return LOOKAHEAD_OPTIONS.some((option) => option.value === String(days)) ? String(days) : "7";
}
const ACCENT = ACCENT_PRESETS.orange;
const ACCENT_STYLE = {
  "--primary": ACCENT.primary,
  "--primary-foreground": ACCENT.primaryForeground,
} as CSSProperties;

const NAV_BUTTON = "text-muted-foreground/70 hover:text-foreground absolute size-6 [&_svg]:size-3.5";

type MiniMonthProps = {
  month: Date;
  anchorTime: number;
  endTime: number;
  onSelect: (date: Date) => void;
};

function MiniMonth({ month, anchorTime, endTime, onSelect }: MiniMonthProps) {
  const monthIndex = month.getMonth();
  return (
    <div className="w-52">
      <div className="text-muted-foreground/60 mb-1 grid grid-cols-7">
        {WEEKDAYS.map((weekday, index) => (
          <span key={index} className="text-2xs text-center font-semibold">
            {weekday}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {getMonthGridDays(month).map((day, index) => {
          const time = day.getTime();
          const column = index % 7;
          const inMonth = day.getMonth() === monthIndex;
          const inRange = time >= anchorTime && time <= endTime;
          const isStart = time === anchorTime;
          const isEnd = time === endTime;
          return (
            <button
              key={getDateKey(day)}
              type="button"
              onClick={() => onSelect(day)}
              className="group relative flex h-8 items-center justify-center outline-none"
            >
              {inRange && (
                <span
                  aria-hidden
                  className={cn(
                    "bg-primary/15 absolute inset-y-0.5 right-0 left-0",
                    (isStart || column === 0) && "rounded-l-md",
                    (isEnd || column === 6) && "rounded-r-md",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-md text-xs",
                  "tabular-nums transition-colors",
                  "group-focus-visible:ring-foreground/30 group-focus-visible:ring-2",
                  isStart && "bg-primary text-primary-foreground font-semibold",
                  !isStart && "group-hover:bg-foreground/10",
                  !isStart && inMonth && "text-foreground",
                  !isStart && !inMonth && "text-muted-foreground/40",
                )}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type CalendarRangePickerProps = {
  onSelect: () => void;
};

export function CalendarRangePicker({ onSelect }: CalendarRangePickerProps) {
  const instanceId = useWidgetInstanceId();
  const listAnchor = useCalendar((d) => d.listAnchor);
  const lookaheadDays = useCalendar((d) => d.lookaheadDays);
  const setListAnchor = useCalendarStore((s) => s.setListAnchor);
  const setLookaheadDays = useCalendarStore((s) => s.setLookaheadDays);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(listAnchor.getFullYear(), listAnchor.getMonth(), 1),
  );

  const anchorTime = startOfDay(listAnchor).getTime();
  const endTime = addDays(listAnchor, Math.max(1, lookaheadDays) - 1).getTime();
  const nextMonth = getMonthOffset(viewMonth, 1);

  const handleSelect = (date: Date) => {
    setListAnchor(instanceId, date);
    onSelect();
  };

  return (
    <div className="flex flex-col gap-3 p-3" style={ACCENT_STYLE}>
      <div className="flex justify-center">
        <ConfigSegmented
          label="Date range"
          value={lookaheadValue(lookaheadDays)}
          options={LOOKAHEAD_OPTIONS}
          onChange={(value) => setLookaheadDays(instanceId, Number(value))}
        />
      </div>
      <div className="flex gap-4">
        <div className="relative flex w-52 items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className={cn(NAV_BUTTON, "left-0")}
            aria-label="Previous month"
            onClick={() => setViewMonth((current) => getMonthOffset(current, -1))}
          >
            <ChevronLeft />
          </Button>
          <span className="text-foreground text-xs font-semibold">
            {monthTitleFormatter.format(viewMonth)}
          </span>
        </div>
        <div className="relative flex w-52 items-center justify-center">
          <span className="text-foreground text-xs font-semibold">
            {monthTitleFormatter.format(nextMonth)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={cn(NAV_BUTTON, "right-0")}
            aria-label="Next month"
            onClick={() => setViewMonth((current) => getMonthOffset(current, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="flex gap-4">
        <MiniMonth
          month={viewMonth}
          anchorTime={anchorTime}
          endTime={endTime}
          onSelect={handleSelect}
        />
        <MiniMonth
          month={nextMonth}
          anchorTime={anchorTime}
          endTime={endTime}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
