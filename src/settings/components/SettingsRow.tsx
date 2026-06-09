import type { ReactNode } from "react";

type Props = {
  title?: string;
  description?: string;
  control?: ReactNode;
  children?: ReactNode;
};

export function SettingsRow({ title, description, control, children }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {(title || control) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {title && (
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{title}</span>
              {description && <span className="text-muted-foreground text-xs">{description}</span>}
            </div>
          )}
          {control && <div className="min-w-0 shrink-0">{control}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
