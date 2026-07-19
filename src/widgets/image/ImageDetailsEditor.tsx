import type { KeyboardEvent, MouseEvent } from "react";
import { ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAssetObjectUrl } from "@/lib/asset-store";
import { cn } from "@/lib/utils";
import { imageAssetStore } from "@/widgets/image/media";
import { type ImageFocalPoint, type ImageItem } from "@/widgets/image/types";
import { useImage, useImageStore } from "@/widgets/image/useImageStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const CAPTION_MAX_LENGTH = 80;
const FOCAL_STEP = 0.05;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function ImageDetailsEditor() {
  const instanceId = useWidgetInstanceId();
  const mode = useImage((c) => c.mode);
  const single = useImage((c) => c.single);
  const items = useImage((c) => c.items);
  const fit = useImage((c) => c.fit);
  const updateItem = useImageStore((s) => s.updateItem);

  const list = mode === "multi" ? items : single ? [single] : [];
  if (list.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {list.map((item) => (
        <ImageDetailRow
          key={item.assetId}
          item={item}
          focalEnabled={fit === "cover"}
          onCaption={(caption) => updateItem(instanceId, item.assetId, { caption })}
          onFocal={(focal) => updateItem(instanceId, item.assetId, { focal })}
        />
      ))}
    </div>
  );
}

type ImageDetailRowProps = {
  item: ImageItem;
  focalEnabled: boolean;
  onCaption: (caption: string) => void;
  onFocal: (focal: ImageFocalPoint) => void;
};

function ImageDetailRow({ item, focalEnabled, onCaption, onFocal }: ImageDetailRowProps) {
  const url = useAssetObjectUrl(imageAssetStore, item.assetId);
  const focal = item.focal ?? { x: 0.5, y: 0.5 };

  const setFromPointer = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onFocal({
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    });
  };

  const nudge = (event: KeyboardEvent<HTMLButtonElement>) => {
    const deltas: Record<string, ImageFocalPoint> = {
      ArrowLeft: { x: -FOCAL_STEP, y: 0 },
      ArrowRight: { x: FOCAL_STEP, y: 0 },
      ArrowUp: { x: 0, y: -FOCAL_STEP },
      ArrowDown: { x: 0, y: FOCAL_STEP },
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    onFocal({ x: clamp01(focal.x + delta.x), y: clamp01(focal.y + delta.y) });
  };

  const thumbClass =
    "border-border/50 bg-foreground/5 relative size-12 shrink-0 overflow-hidden rounded-md border";
  const marker = { left: `${focal.x * 100}%`, top: `${focal.y * 100}%` };
  const preview = url ? (
    <img
      src={url}
      alt=""
      className="size-full object-cover"
      style={focalEnabled ? { objectPosition: `${focal.x * 100}% ${focal.y * 100}%` } : undefined}
    />
  ) : (
    <div className="text-muted-foreground/40 grid size-full place-items-center [&_svg]:size-4">
      <ImageIcon aria-hidden />
    </div>
  );

  return (
    <div
      className={cn(`
        border-border/60 bg-foreground/5 flex items-center gap-2.5 rounded-lg border p-2
      `)}
    >
      {focalEnabled ? (
        <button
          type="button"
          onClick={setFromPointer}
          onKeyDown={nudge}
          aria-label={`Focal point for ${item.fileName}`}
          className={cn(
            thumbClass,
            "focus-visible:ring-ring cursor-crosshair outline-none focus-visible:ring-2",
          )}
        >
          {preview}
          <span
            aria-hidden
            style={marker}
            className={cn(`
              border-primary bg-primary/40 absolute size-2.5 -translate-x-1/2 -translate-y-1/2
              rounded-full border-2 shadow-sm
            `)}
          />
        </button>
      ) : (
        <div className={thumbClass}>{preview}</div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Input
          value={item.caption ?? ""}
          maxLength={CAPTION_MAX_LENGTH}
          onChange={(event) => onCaption(event.target.value)}
          placeholder="Add a caption"
          aria-label={`Caption for ${item.fileName}`}
          className="text-xs"
        />
        {focalEnabled && (
          <span className="text-muted-foreground text-2xs">
            Click the thumbnail to set the focal point
          </span>
        )}
      </div>
    </div>
  );
}
