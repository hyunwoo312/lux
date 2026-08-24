import type { ReactNode } from "react";
import { DialogCloseButton } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const DIALOG_RAIL = `
  border-edge-2 bg-surface-2
  dark:bg-surface-raised
  flex shrink-0 flex-col border-r
`;

export function DialogHeaderBar({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-edge-2 flex h-12 shrink-0 items-center gap-3 border-b pr-3 pl-6",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
      <DialogCloseButton className="shrink-0" />
    </header>
  );
}
