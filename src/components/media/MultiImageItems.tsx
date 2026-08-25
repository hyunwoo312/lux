import type { CSSProperties } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { GRID_MODIFIERS } from "@/lib/dnd";
import { useAssetThumbUrl, type AssetStore, type MediaImageItem } from "@/lib/asset-store";
import { getMetadataLabel } from "@/lib/media-format";

type MultiImageItemsProps = {
  items: MediaImageItem[];
  assetStore: AssetStore;
  disabled: boolean;
  onRemove: (item: MediaImageItem) => void;
  onReorder: (items: MediaImageItem[]) => void;
};

export function MultiImageItems({
  items,
  assetStore,
  disabled,
  onRemove,
  onReorder,
}: MultiImageItemsProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.assetId === active.id);
    const newIndex = items.findIndex((item) => item.assetId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={GRID_MODIFIERS}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((item) => item.assetId)} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-1.5">
          {items.map((item) => (
            <SortableImage
              key={item.assetId}
              item={item}
              assetStore={assetStore}
              disabled={disabled}
              onRemove={() => onRemove(item)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

type SortableImageProps = {
  item: MediaImageItem;
  assetStore: AssetStore;
  disabled: boolean;
  onRemove: () => void;
};

function SortableImage({ item, assetStore, disabled, onRemove }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.assetId,
  });
  const url = useAssetThumbUrl(assetStore, item.assetId);
  const meta = getMetadataLabel(item.mimeType, item.size);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <Tooltip
      solid
      content={
        <span className="flex flex-col gap-0.5">
          <span className="break-words">{item.fileName}</span>
          {meta && <span className="text-ink-3">{meta}</span>}
        </span>
      }
    >
      <li
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          `
            border-border/50 bg-foreground/5 focus-ring relative aspect-square cursor-grab
            touch-none overflow-hidden rounded-lg border
          `,
          isDragging && "opacity-50",
        )}
      >
        {url ? (
          <img src={url} alt={item.fileName} className="size-full object-cover" />
        ) : (
          <div className="text-ink-3 grid size-full place-items-center [&_svg]:size-5">
            <ImageIcon aria-hidden />
          </div>
        )}
        <button
          type="button"
          disabled={disabled}
          aria-label={`Remove ${item.fileName}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="
            press bg-card text-ink-2
            hover:text-destructive
            absolute top-1 right-1 grid size-5 cursor-pointer place-items-center rounded-sm
            disabled:pointer-events-none disabled:opacity-50
            [&_svg]:size-3.5
          "
        >
          <X aria-hidden />
        </button>
      </li>
    </Tooltip>
  );
}
