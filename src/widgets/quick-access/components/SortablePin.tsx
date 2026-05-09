import type { CSSProperties, KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemActionButton } from "@/widgets/quick-access/components/ItemActionButton";
import { LinkIcon } from "@/widgets/quick-access/components/LinkIcon";
import type { QuickAccessView, QuickLink } from "@/widgets/quick-access/types";

type SortablePinProps = {
  link: QuickLink;
  view: QuickAccessView;
  onOpen: (url: string) => void;
  onEdit: () => void;
  onRemove: () => void;
};

const GRID_ACTION =
  "scale-90 opacity-0 transition duration-200 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100";

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

  if (view === "list") {
    return (
      <li
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => onOpen(link.url)}
        onKeyDown={handleKeyDown}
        className={cn(
          `
            group
            hover:bg-foreground/5
            relative flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5
            transition-colors outline-none
          `,
          isDragging && "opacity-50",
        )}
      >
        <LinkIcon url={link.url} view={view} />
        <span
          className="
            min-w-0 flex-1 truncate text-sm transition-[padding] duration-200
            group-focus-within:pr-12
            group-hover:pr-12
          "
        >
          {link.title}
        </span>
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
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(link.url)}
      onKeyDown={handleKeyDown}
      className={cn(
        `
          group
          hover:bg-foreground/5
          relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg p-2
          transition-colors outline-none
        `,
        isDragging && "opacity-50",
      )}
    >
      <LinkIcon url={link.url} view={view} />
      <span className="w-full truncate text-center text-xs">{link.title}</span>
      <div className={cn("absolute top-1 left-1", GRID_ACTION)}>
        <ItemActionButton
          label={`Edit ${link.title}`}
          onClick={onEdit}
          className="bg-card/80 rounded-md p-1 backdrop-blur-sm"
        >
          <Pencil />
        </ItemActionButton>
      </div>
      <div className={cn("absolute top-1 right-1", GRID_ACTION)}>
        <ItemActionButton
          label={`Remove ${link.title}`}
          onClick={onRemove}
          className="bg-card/80 rounded-md p-1 backdrop-blur-sm hover:text-destructive"
        >
          <X />
        </ItemActionButton>
      </div>
    </li>
  );
}
