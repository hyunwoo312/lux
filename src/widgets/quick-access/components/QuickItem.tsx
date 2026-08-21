import { cn } from "@/lib/utils";
import { LinkIcon } from "@/widgets/quick-access/components/LinkIcon";
import type { QuickAccessView } from "@/widgets/quick-access/types";

type QuickItemProps = {
  url: string;
  title: string;
  view: QuickAccessView;
  icon?: string;
  trailingPad?: string;
};

export function QuickItem({ url, title, view, icon, trailingPad }: QuickItemProps) {
  return (
    <>
      <LinkIcon url={url} view={view} icon={icon} />
      <span
        className={cn(
          "truncate",
          view === "grid"
            ? "w-full text-center text-caption"
            : "min-w-0 flex-1 text-body transition-[padding] duration-200",
          trailingPad,
        )}
      >
        {title}
      </span>
    </>
  );
}
