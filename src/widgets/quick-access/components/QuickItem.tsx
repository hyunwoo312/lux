import { cn } from "@/lib/utils";
import { LinkIcon } from "@/widgets/quick-access/components/LinkIcon";
import type { QuickAccessView } from "@/widgets/quick-access/types";
import { ROW } from "@/lib/row";
import { hostnameOf } from "@/widgets/quick-access/lib/url";

type QuickItemProps = {
  url: string;
  title: string;
  view: QuickAccessView;
  icon?: string;
  trailingPad?: string;
  detail?: string;
};

export function QuickItem({ url, title, view, icon, trailingPad, detail }: QuickItemProps) {
  return (
    <>
      <LinkIcon url={url} view={view} icon={icon} />
      <span
        className={cn(
          "flex min-w-0 flex-col gap-0.5",
          view === "grid"
            ? "w-full text-center text-caption"
            : cn("min-w-0 flex-1 text-body", ROW.revealPad),
          trailingPad,
        )}
      >
        <span className="truncate">{title}</span>
        <span className="text-ink-3 block truncate text-micro font-normal">
          {detail ?? hostnameOf(url)}
        </span>
      </span>
    </>
  );
}
