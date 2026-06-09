import { cn } from "@/lib/utils";
import { LinkIcon } from "@/widgets/quick-access/components/LinkIcon";
import type { QuickAccessView } from "@/widgets/quick-access/types";

type QuickItemProps = {
  url: string;
  title: string;
  view: QuickAccessView;
  trailingPad?: string;
};

export function QuickItem({ url, title, view, trailingPad }: QuickItemProps) {
  return (
    <>
      <LinkIcon url={url} view={view} />
      <span
        className={cn(
          "truncate",
          view === "grid"
            ? "w-full text-center text-xs"
            : "min-w-0 flex-1 text-sm transition-[padding] duration-200",
          trailingPad,
        )}
      >
        {title}
      </span>
    </>
  );
}
