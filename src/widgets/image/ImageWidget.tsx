import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetContentProps } from "@/widgets/core/types";
import { useImageUploads } from "@/widgets/image/hooks/useImageUploads";
import { IMAGE_MIME_TYPES, MAX_MULTI_IMAGES } from "@/widgets/image/types";
import { useImageStore } from "@/widgets/image/useImageStore";

function getDroppedFiles(transfer: DataTransfer): File[] {
  return Array.from(transfer.files).filter((file) => file.type.startsWith("image/"));
}

export function ImageWidget({ editing }: WidgetContentProps) {
  const mode = useImageStore((s) => s.mode);
  const single = useImageStore((s) => s.single);
  const items = useImageStore((s) => s.items);
  const rotateOnClick = useImageStore((s) => s.rotateOnClick);
  const advanceImage = useImageStore((s) => s.advanceImage);
  const { saving, error, setError, handleFiles } = useImageUploads();
  const reduced = useReducedMotion();

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const hasImage = mode === "multi" ? items.length > 0 : Boolean(single);
  const atCapacity = mode === "multi" && items.length >= MAX_MULTI_IMAGES;
  const clickAdvances = mode === "multi" && rotateOnClick;
  const disabled = editing || saving;
  const addLabel = mode === "multi" ? "Add images" : "Add image";

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 3000);
    return () => window.clearTimeout(id);
  }, [error, setError]);

  const openPicker = () => {
    if (!editing) inputRef.current?.click();
  };

  const handleImageClick = () => {
    if (editing) return;
    if (clickAdvances) {
      advanceImage();
      return;
    }
    if (atCapacity) {
      setError(`Image pool is full — ${MAX_MULTI_IMAGES} images max.`);
      return;
    }
    openPicker();
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    handleFiles(files);
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (editing || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDragging(true);
  };
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!editing && event.dataTransfer.types.includes("Files")) event.preventDefault();
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (editing) return;
    event.preventDefault();
    setDragging(false);
    handleFiles(getDroppedFiles(event.dataTransfer));
  };

  return (
    <div
      className="relative h-full w-full"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_MIME_TYPES.join(",")}
        multiple={mode === "multi"}
        disabled={disabled}
        onChange={onInputChange}
        className="pointer-events-none absolute size-px opacity-0"
      />

      {hasImage ? (
        <button
          type="button"
          disabled={disabled}
          onClick={handleImageClick}
          aria-label={clickAdvances ? "Next image" : "Replace image"}
          className={cn(
            "h-full w-full cursor-pointer outline-none transition-colors",
            disabled && "cursor-default",
            dragging && "ring-primary bg-black/10 ring-2 ring-inset",
          )}
        />
      ) : (
        <div className="h-full w-full p-3">
          <button
            type="button"
            disabled={disabled}
            onClick={openPicker}
            className={cn(
              `
                text-muted-foreground/70
                hover:text-foreground hover:border-foreground/40
                border-border/60 flex h-full w-full cursor-pointer flex-col items-center
                justify-center gap-2 rounded-lg border border-dashed p-4 text-center
                transition-colors outline-none
                disabled:cursor-default disabled:opacity-60
              `,
              dragging && "border-primary text-foreground",
            )}
          >
            <ImageIcon className="size-7" aria-hidden />
            <strong className="text-sm font-semibold">{addLabel}</strong>
            <span className="text-muted-foreground text-xs">
              Upload PNG, JPG, WebP, or GIF up to 5 MB.
            </span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            role="status"
            className="
              border-border bg-background/95 text-foreground pointer-events-none absolute bottom-3
              left-1/2 z-10 max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-md border px-2.5
              py-1.5 text-center text-xs shadow-md
            "
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
