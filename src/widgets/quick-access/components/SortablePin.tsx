import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { PinMenu } from "@/widgets/quick-access/components/PinMenu";
import { QuickItem } from "@/widgets/quick-access/components/QuickItem";
import { ROW } from "@/lib/row";
import { qaTileClass } from "@/widgets/quick-access/lib/itemStyles";
import { QuickLinkAnchor } from "@/widgets/quick-access/components/QuickLinkAnchor";
import type { OpenBehavior, QuickAccessView, QuickLink } from "@/widgets/quick-access/types";

type SortablePinProps = {
  link: QuickLink;
  view: QuickAccessView;
  openBehavior: OpenBehavior;
  onEdit: () => void;
  onRemove: () => void;
};

export function SortablePin({ link, view, openBehavior, onEdit, onRemove }: SortablePinProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id, attributes: { role: "link" } });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };
  return (
    <li ref={setNodeRef} style={style} className={cn("group relative", isDragging && "opacity-60")}>
      <QuickLinkAnchor
        data-pin-id={link.id}
        url={link.url}
        title={link.title}
        openBehavior={openBehavior}
        onClick={(event) => {
          if (isDragging) event.preventDefault();
        }}
        className={cn("focus-ring", qaTileClass(view))}
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
      >
        <QuickItem
          url={link.url}
          title={link.title}
          view={view}
          icon={link.icon}
          trailingPad={view === "list" ? "pr-7" : undefined}
        />
      </QuickLinkAnchor>
      <div
        className={cn(
          view === "grid" ? "absolute top-0 right-0" : "absolute top-1/2 right-1 -translate-y-1/2",
          ROW.reveal,
        )}
      >
        <PinMenu link={link} openBehavior={openBehavior} onEdit={onEdit} onRemove={onRemove} />
      </div>
    </li>
  );
}
