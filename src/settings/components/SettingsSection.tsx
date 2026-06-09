import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SettingsSection({ title, description, action, children }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <Separator className="mb-1.5" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {title}
          </h3>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
