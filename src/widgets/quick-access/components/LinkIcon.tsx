import { cn } from "@/lib/utils";
import { Favicon } from "@/widgets/quick-access/components/Favicon";
import type { QuickAccessView } from "@/widgets/quick-access/types";

const FAVICON_SIZE = 32;

export function LinkIcon({
  url,
  view,
  icon,
}: {
  url: string;
  view: QuickAccessView;
  icon?: string;
}) {
  return (
    <span
      className={cn(
        `
          block shrink-0 overflow-hidden transition-[width,height,border-radius] duration-300
          ease-out
          motion-reduce:transition-none
        `,
        view === "grid" ? "size-8 rounded-md text-body" : "size-4 rounded-xs text-micro",
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className={cn(
            "bg-foreground/5 flex size-full items-center justify-center leading-none",
            view === "grid" ? "text-lg" : "text-micro",
          )}
        >
          {icon}
        </span>
      ) : (
        <Favicon url={url} size={FAVICON_SIZE} className="size-full" />
      )}
    </span>
  );
}
