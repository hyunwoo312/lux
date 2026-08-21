import { ConfigSegmented } from "@/components/config/WidgetConfig";
import { ClearImagesButton } from "@/components/media/ClearImagesButton";
import { ImageUploadButton } from "@/components/media/ImageUploadButton";
import { MultiImageItems } from "@/components/media/MultiImageItems";
import { getMetadataLabel } from "@/lib/media-format";
import { useWallpaperUploads } from "@/app/useWallpaperUploads";
import { SettingsRow } from "@/settings/components/SettingsRow";
import { WallpaperGalleryPanel } from "@/settings/components/WallpaperGalleryPanel";
import { WallpaperGeneratedPanel } from "@/settings/components/WallpaperGeneratedPanel";
import { WallpaperImageOptions } from "@/settings/components/WallpaperImageOptions";
import {
  MAX_WALLPAPER_IMAGES,
  useWallpaperStore,
  wallpaperAssets,
  type WallpaperSource,
} from "@/stores/useWallpaperStore";

const SOURCE_OPTIONS: { value: WallpaperSource; label: string }[] = [
  { value: "generated", label: "Patterns" },
  { value: "gallery", label: "Gallery" },
  { value: "custom", label: "Custom" },
];

export function WallpaperSetting() {
  const source = useWallpaperStore((s) => s.source);
  const setSource = useWallpaperStore((s) => s.setSource);

  return (
    <>
      <div className="flex flex-col gap-4">
        <SettingsRow
          title="Type"
          description="A pattern Lux draws, one of ours, or an image of your own"
          control={
            <ConfigSegmented
              label="Wallpaper type"
              value={source}
              options={SOURCE_OPTIONS}
              onChange={setSource}
            />
          }
        />

        {source === "generated" && <WallpaperGeneratedPanel />}

        {source === "gallery" && (
          <>
            <WallpaperGalleryPanel />
            <WallpaperImageOptions />
          </>
        )}

        {source === "custom" && (
          <>
            <CustomUploadPanel />
            <WallpaperImageOptions />
          </>
        )}
      </div>
    </>
  );
}

function CustomUploadPanel() {
  const mode = useWallpaperStore((s) => s.mode);
  const single = useWallpaperStore((s) => s.single);
  const items = useWallpaperStore((s) => s.items);
  const setItems = useWallpaperStore((s) => s.setItems);
  const { saving, error, handleFiles, removeItem, clearAll } = useWallpaperUploads();

  const isMulti = mode === "multi";
  const hasImages = isMulti ? items.length > 0 : Boolean(single);
  const canAdd = !isMulti || items.length < MAX_WALLPAPER_IMAGES;
  const uploadTitle = isMulti ? "Add images" : single ? "Replace image" : "Upload image";
  const uploadDescription = isMulti
    ? `${items.length} / ${MAX_WALLPAPER_IMAGES} images · up to 10 MB each`
    : (single && getMetadataLabel(single.mimeType, single.size)) ||
      "PNG, JPG, WebP, or GIF up to 10 MB";

  return (
    <SettingsRow
      title={isMulti ? "Images" : "Image"}
      control={
        hasImages ? (
          <ClearImagesButton
            label={isMulti ? "Clear images" : "Clear image"}
            count={isMulti ? items.length : single ? 1 : 0}
            disabled={saving}
            onClear={() => void clearAll()}
          />
        ) : undefined
      }
    >
      <ImageUploadButton
        title={uploadTitle}
        description={uploadDescription}
        multiple={isMulti}
        disabled={saving || !canAdd}
        onFiles={handleFiles}
      />
      {isMulti && items.length > 0 && (
        <MultiImageItems
          items={items}
          assetStore={wallpaperAssets}
          disabled={saving}
          onRemove={removeItem}
          onReorder={setItems}
        />
      )}
      {error && <p className="text-destructive text-caption">{error}</p>}
    </SettingsRow>
  );
}
