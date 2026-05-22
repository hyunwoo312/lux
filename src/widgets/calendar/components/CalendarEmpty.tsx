import type { LucideIcon } from "lucide-react";

type CalendarEmptyProps = {
  icon: LucideIcon;
  children: string;
};

export function CalendarEmpty({ icon: Icon, children }: CalendarEmptyProps) {
  return (
    <div className="
      text-muted-foreground/60 flex h-full flex-col items-center justify-center gap-2 px-4
      text-center
    ">
      <Icon className="size-7 opacity-70" aria-hidden />
      <span className="text-sm">{children}</span>
    </div>
  );
}
