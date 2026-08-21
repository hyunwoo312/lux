import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { TYPE } from "@/lib/type";

type Props = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SettingsSection({ title, action, children }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <Separator className="mb-1.5" />
      <div className="flex items-start justify-between gap-4">
        <h3 className={TYPE.title}>{title}</h3>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
