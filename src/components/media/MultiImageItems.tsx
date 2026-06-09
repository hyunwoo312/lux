import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssetObjectUrl, type AssetStore, type MediaImageItem } from "@/lib/asset-store";
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
  const url = useAssetObjectUrl(assetStore, item.assetId);
  const meta = getMetadataLabel(item.mimeType, item.size);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isDragging) setCursor(null);
  }, [isDragging]);

  const trackCursor = (event: PointerEvent) => setCursor({ x: event.clientX, y: event.clientY });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onPointerEnter={trackCursor}
        onPointerMove={trackCursor}
        onPointerLeave={() => setCursor(null)}
        className={cn(
          `
            border-border/50 bg-foreground/5 relative aspect-square cursor-grab touch-none
            overflow-hidden rounded-lg border outline-none
          `,
          isDragging && "opacity-50",
        )}
      >
        {url ? (
          <img src={url} alt={item.fileName} className="size-full object-cover" />
        ) : (
          <div className="text-muted-foreground/40 grid size-full place-items-center [&_svg]:size-5">
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
            bg-card text-foreground/80
            hover:text-destructive
            absolute top-1 right-1 grid size-5 cursor-pointer place-items-center rounded-md
            transition-colors
            disabled:pointer-events-none disabled:opacity-50
            [&_svg]:size-3.5
          "
        >
          <X aria-hidden />
        </button>
      </li>
      {cursor &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: cursor.x + 4, top: cursor.y + 4 }}
            className="
              bg-popover text-popover-foreground border-border pointer-events-none fixed z-[100]
              flex max-w-[14rem] flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-2xs shadow-lg
            "
          >
            <span className="font-medium break-words">{item.fileName}</span>
            {meta && <span className="text-muted-foreground">{meta}</span>}
          </div>,
          document.body,
        )}
    </>
  );
}
