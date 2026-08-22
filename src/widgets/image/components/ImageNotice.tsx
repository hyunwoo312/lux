import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NOTICE =
  "text-ink-3 flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-caption";

export function ImageNotice({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <div className={NOTICE}>
      <Icon className={cn("size-6", tone ?? "text-ink-4")} aria-hidden />
      {children}
    </div>
  );
}
