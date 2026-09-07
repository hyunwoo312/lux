import { tap } from "@/lib/motion";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRovingFocus } from "@/hooks/useRovingFocus";
import { cn } from "@/lib/utils";
import { GALLERY_WALLPAPERS } from "@/lib/wallpaper-gallery";
import { ConfigRow } from "@/components/config/Config";
import { MAX_WALLPAPER_IMAGES, useWallpaperStore } from "@/stores/useWallpaperStore";

const BADGE =
  "bg-primary text-primary-foreground absolute top-1 right-1 grid size-4 place-items-center rounded-full";

const TILE = `focus-ring border-edge-3 hover:border-foreground/40 relative aspect-video cursor-pointer
   overflow-hidden rounded-md border`;

export function WallpaperGalleryPanel() {
  const mode = useWallpaperStore((s) => s.mode);
  const gallerySingle = useWallpaperStore((s) => s.gallerySingle);
  const galleryItems = useWallpaperStore((s) => s.galleryItems);
  const setGallerySingle = useWallpaperStore((s) => s.setGallerySingle);
  const setGalleryItems = useWallpaperStore((s) => s.setGalleryItems);
  const reduced = useReducedMotion();

  const isMulti = mode === "multi";
  const selected = isMulti ? galleryItems : gallerySingle ? [gallerySingle] : [];
  const atCap = isMulti && galleryItems.length >= MAX_WALLPAPER_IMAGES;
  const title = isMulti ? "Wallpapers" : "Wallpaper";
  const roving = useRovingFocus({
    count: GALLERY_WALLPAPERS.length,
    activeIndex: isMulti
      ? undefined
      : Math.max(
          0,
          GALLERY_WALLPAPERS.findIndex((wallpaper) => wallpaper.id === gallerySingle),
        ),
    onActivate: isMulti
      ? undefined
      : (index) => {
          const next = GALLERY_WALLPAPERS[index];
          if (next) setGallerySingle(next.id);
        },
  });

  const toggle = (id: string) => {
    if (!isMulti) {
      setGallerySingle(id);
      return;
    }
    if (galleryItems.includes(id)) {
      if (galleryItems.length === 1) return;
      setGalleryItems(galleryItems.filter((item) => item !== id));
      return;
    }
    if (atCap) return;
    setGalleryItems([...galleryItems, id]);
  };

  return (
    <ConfigRow
      title={title}
      description={isMulti ? "Numbers show the order they rotate in" : "Pick one"}
    >
      <div
        role={isMulti ? "group" : "radiogroup"}
        aria-label={title}
        {...roving.containerProps}
        className="grid grid-cols-3 gap-2 sm:grid-cols-5"
      >
        {GALLERY_WALLPAPERS.map((wallpaper, index) => {
          const isSelected = selected.includes(wallpaper.id);
          const isDisabled = !isSelected && atCap;
          return (
            <motion.button
              key={wallpaper.id}
              {...roving.itemProps(index)}
              type="button"
              role={isMulti ? "checkbox" : "radio"}
              aria-checked={isSelected}
              aria-label={wallpaper.name}
              title={wallpaper.name}
              aria-disabled={isDisabled || undefined}
              onClick={() => toggle(wallpaper.id)}
              {...tap(reduced || isDisabled, "surface")}
              className={cn(
                TILE,
                isSelected && "ring-primary ring-2",
                isDisabled && "cursor-not-allowed opacity-40",
              )}
            >
              <img src={wallpaper.thumb} alt="" loading="lazy" className="size-full object-cover" />
              {isSelected && (
                <span className={BADGE}>
                  {isMulti ? (
                    <span className="text-micro leading-none font-semibold tabular-nums">
                      {selected.indexOf(wallpaper.id) + 1}
                    </span>
                  ) : (
                    <Check className="size-3" />
                  )}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </ConfigRow>
  );
}
