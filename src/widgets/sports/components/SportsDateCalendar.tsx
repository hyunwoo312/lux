import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localDayKey } from "@/lib/clock";
import { cn } from "@/lib/utils";

export function SportsDateCalendar({
  date,
  min,
  max,
  today,
  onSelect,
}: {
  date: Date;
  min: string;
  max: string;
  today: string;
  onSelect: (value: string) => void;
}) {
  const [month, setMonth] = useState(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  const [focused, setFocused] = useState(localDayKey(date));
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    root.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused]);
  const moveMonth = (step: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + step, 1, 12);
    const key = localDayKey(next);
    setMonth(next);
    setFocused(key < min ? min : key > max ? max : key);
  };
  const previous = new Date(month.getFullYear(), month.getMonth(), 0, 12);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((month.getDay() + count) / 7) * 7;
  const title = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return (
    <div ref={root} className="space-y-2">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Previous month"
          disabled={localDayKey(previous) < min}
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft />
        </Button>
        <span className="text-caption font-medium" aria-live="polite">
          {title}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Next month"
          disabled={localDayKey(next) > max}
          onClick={() => moveMonth(1)}
        >
          <ChevronRight />
        </Button>
      </div>
      <table
        role="grid"
        aria-label={title}
        className="w-full table-fixed border-separate border-spacing-0.5"
      >
        <thead>
          <tr>
            {Array.from({ length: 7 }, (_, day) => (
              <th
                key={day}
                scope="col"
                aria-label={new Date(2026, 0, 4 + day).toLocaleDateString(undefined, {
                  weekday: "long",
                })}
                className="text-ink-3 text-micro h-7 font-normal"
              >
                {new Date(2026, 0, 4 + day).toLocaleDateString(undefined, { weekday: "narrow" })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells / 7 }, (_, week) => (
            <tr key={week}>
              {Array.from({ length: 7 }, (_, weekday) => {
                const day = week * 7 + weekday - month.getDay() + 1;
                if (day < 1 || day > count) return <td key={weekday} />;
                const at = new Date(month.getFullYear(), month.getMonth(), day, 12);
                const key = localDayKey(at);
                const selected = key === localDayKey(date);
                return (
                  <td key={weekday} aria-selected={selected}>
                    <button
                      type="button"
                      data-date={key}
                      tabIndex={key === focused ? 0 : -1}
                      disabled={key < min || key > max}
                      aria-label={at.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      aria-current={key === today ? "date" : undefined}
                      onFocus={() => setFocused(key)}
                      onClick={() => onSelect(key)}
                      onKeyDown={(event) => {
                        const step = {
                          ArrowLeft: -1,
                          ArrowRight: 1,
                          ArrowUp: -7,
                          ArrowDown: 7,
                          Home: -weekday,
                          End: 6 - weekday,
                        }[event.key];
                        if (step == null) return;
                        event.preventDefault();
                        const target = new Date(at);
                        target.setDate(target.getDate() + step);
                        const value = localDayKey(target);
                        const bounded = value < min ? min : value > max ? max : value;
                        const destination = new Date(`${bounded}T12:00:00`);
                        setMonth(
                          new Date(destination.getFullYear(), destination.getMonth(), 1, 12),
                        );
                        setFocused(bounded);
                      }}
                      className={cn(
                        `
                          press focus-ring text-caption h-8 w-full rounded-md tabular-nums
                          disabled:opacity-30
                        `,
                        selected
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-foreground/5",
                        key === today && !selected && "ring-primary/40 ring-1 ring-inset",
                      )}
                    >
                      {day}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
