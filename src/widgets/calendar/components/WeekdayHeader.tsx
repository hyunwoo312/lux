import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS } from "@/widgets/calendar/lib/dates";

type WeekdayHeaderProps = {
  className?: string;
};

export function WeekdayHeader({ className }: WeekdayHeaderProps) {
  return (
    <div aria-hidden className={cn("text-ink-4 grid grid-cols-7", className)}>
      {WEEKDAY_LABELS.map((weekday) => (
        <span
          key={weekday.long}
          title={weekday.long}
          className="text-micro text-center font-semibold"
        >
          {weekday.narrow}
        </span>
      ))}
    </div>
  );
}
