import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemActionButton } from "@/components/ItemActionButton";
import { QuickItem } from "@/widgets/quick-access/components/QuickItem";
import { QA_REVEAL, qaTileClass } from "@/widgets/quick-access/lib/itemStyles";
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
    <li ref={setNodeRef} style={style} className={cn("group relative", isDragging && "opacity-50")}>
      <QuickLinkAnchor
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
          trailingPad={view === "list" ? "group-hover:pr-12 group-focus-within:pr-12" : undefined}
        />
      </QuickLinkAnchor>
      {view === "grid" ? (
        <>
          <div className={cn("absolute top-1 left-1", QA_REVEAL)}>
            <ItemActionButton label={`Edit ${link.title}`} onClick={onEdit}>
              <Pencil />
            </ItemActionButton>
          </div>
          <div className={cn("absolute top-1 right-1", QA_REVEAL)}>
            <ItemActionButton
              label={`Remove ${link.title}`}
              onClick={onRemove}
              className="hover:text-destructive"
            >
              <X />
            </ItemActionButton>
          </div>
        </>
      ) : (
        <div
          className="
            absolute top-1/2 right-2 flex -translate-y-1/2 translate-x-2 items-center gap-1
            opacity-0 transition duration-200
            group-focus-within:translate-x-0 group-focus-within:opacity-100
            group-hover:translate-x-0 group-hover:opacity-100
          "
        >
          <ItemActionButton label={`Edit ${link.title}`} onClick={onEdit}>
            <Pencil />
          </ItemActionButton>
          <ItemActionButton
            label={`Remove ${link.title}`}
            onClick={onRemove}
            className="hover:text-destructive"
          >
            <X />
          </ItemActionButton>
        </div>
      )}
    </li>
  );
}
