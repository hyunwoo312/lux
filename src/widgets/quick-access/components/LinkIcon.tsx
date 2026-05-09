import { cn } from "@/lib/utils";
import { Favicon } from "@/widgets/quick-access/components/Favicon";
import type { QuickAccessView } from "@/widgets/quick-access/types";

const FAVICON_SIZE = 32;

export function LinkIcon({ url, view }: { url: string; view: QuickAccessView }) {
  return (
    <span
      className={cn(
        `
          block shrink-0 overflow-hidden transition-[width,height,border-radius] duration-300
          ease-out
          motion-reduce:transition-none
        `,
        view === "grid" ? "size-8 rounded-md text-sm" : "size-4 rounded-[4px] text-[0.6rem]",
      )}
    >
      <Favicon url={url} size={FAVICON_SIZE} className="size-full" />
    </span>
  );
}
