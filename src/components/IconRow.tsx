import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconRowProps = {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  control?: ReactNode;
  children: ReactNode;
};

export function IconRow({ icon: Icon, title, action, control, children }: IconRowProps) {
  return (
    <div className={cn("flex gap-3", control ? "items-center" : "items-start")}>
      <span className="
        bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg
        [&_svg]:size-4
      ">
        <Icon aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-muted-foreground text-xs leading-relaxed">{children}</span>
        {action}
      </div>
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}
