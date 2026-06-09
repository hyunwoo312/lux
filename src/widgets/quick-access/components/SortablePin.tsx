import type { CSSProperties, KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemActionButton } from "@/widgets/quick-access/components/ItemActionButton";
import { QuickItem } from "@/widgets/quick-access/components/QuickItem";
import { QA_REVEAL, qaTileClass } from "@/widgets/quick-access/lib/itemStyles";
import type { QuickAccessView, QuickLink } from "@/widgets/quick-access/types";

type SortablePinProps = {
  link: QuickLink;
  view: QuickAccessView;
  onOpen: (url: string) => void;
  onEdit: () => void;
  onRemove: () => void;
};

export function SortablePin({ link, view, onOpen, onEdit, onRemove }: SortablePinProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(link.url);
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(link.url)}
      onKeyDown={handleKeyDown}
      className={cn("group relative outline-none", qaTileClass(view), isDragging && "opacity-50")}
    >
      <QuickItem
        url={link.url}
        title={link.title}
        view={view}
        trailingPad={view === "list" ? "group-hover:pr-12 group-focus-within:pr-12" : undefined}
      />
      {view === "grid" ? (
        <>
          <div className={cn("absolute top-1 left-1", QA_REVEAL)}>
            <ItemActionButton
              label={`Edit ${link.title}`}
              onClick={onEdit}
              className="bg-card rounded-md p-1"
            >
              <Pencil />
            </ItemActionButton>
          </div>
          <div className={cn("absolute top-1 right-1", QA_REVEAL)}>
            <ItemActionButton
              label={`Remove ${link.title}`}
              onClick={onRemove}
              className="bg-card rounded-md p-1 hover:text-destructive"
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
