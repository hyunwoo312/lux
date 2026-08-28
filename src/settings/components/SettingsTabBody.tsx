import type { ReactNode } from "react";

export function SettingsTabBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 [&>section:first-of-type>:first-child]:hidden">
      {children}
    </div>
  );
}
