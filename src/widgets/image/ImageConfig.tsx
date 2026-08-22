import {
  ConfigSegmented,
  WidgetConfigDisclosure,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { ClearImagesButton } from "@/components/media/ClearImagesButton";
import { ImageUploadButton } from "@/components/media/ImageUploadButton";
import { MultiImageItems } from "@/components/media/MultiImageItems";
import { getMetadataLabel } from "@/lib/media-format";
import { ImageAppearanceGroup } from "@/widgets/image/config/ImageAppearanceGroup";
import { ImageRotationGroup } from "@/widgets/image/config/ImageRotationGroup";
import { ImageDetailsEditor } from "@/widgets/image/ImageDetailsEditor";
import { useImageUploads } from "@/widgets/image/hooks/useImageUploads";
import { imageAssetStore } from "@/widgets/image/media";
import { MAX_MULTI_IMAGES, type ImageMode } from "@/widgets/image/types";
import { useImage, useImageStore } from "@/widgets/image/useImageStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const MODE_OPTIONS: { value: ImageMode; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "multi", label: "Multi" },
];

export function ImageConfig() {
  const instanceId = useWidgetInstanceId();
  const mode = useImage((c) => c.mode);
  const single = useImage((c) => c.single);
  const items = useImage((c) => c.items);
  const fit = useImage((c) => c.fit);
  const setMode = useImageStore((s) => s.setMode);
  const setItems = useImageStore((s) => s.setItems);
  const { saving, error, handleFiles, removeItem, clearAll } = useImageUploads();

  const isMulti = mode === "multi";
  const hasImages = isMulti ? items.length > 0 : Boolean(single);
  const canAdd = !isMulti || items.length < MAX_MULTI_IMAGES;
  const uploadTitle = isMulti ? "Add images" : single ? "Replace image" : "Upload image";
  const uploadDescription = isMulti
    ? `${items.length} / ${MAX_MULTI_IMAGES} images · up to 5 MB each`
    : (single && getMetadataLabel(single.mimeType, single.size)) ||
      "PNG, JPG, WebP, or GIF up to 5 MB";

  return (
    <>
      <WidgetConfigGroup label="Image">
        <WidgetConfigItem
          title="Mode"
          description="One image or a rotating pool"
          control={
            <ConfigSegmented
              label="Image mode"
              value={mode}
              options={MODE_OPTIONS}
              onChange={(value) => setMode(instanceId, value)}
            />
          }
        />
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ImageUploadButton
              title={uploadTitle}
              description={uploadDescription}
              multiple={isMulti}
              disabled={saving || !canAdd}
              onFiles={handleFiles}
            />
          </div>
          {hasImages && (
            <ClearImagesButton
              label={isMulti ? "Clear images" : "Clear image"}
              count={isMulti ? items.length : single ? 1 : 0}
              disabled={saving}
              onClear={() => void clearAll()}
            />
          )}
        </div>
        {isMulti && items.length > 0 && (
          <MultiImageItems
            items={items}
            assetStore={imageAssetStore}
            disabled={saving}
            onRemove={removeItem}
            onReorder={(next) => setItems(instanceId, next)}
          />
        )}
        {hasImages && (
          <WidgetConfigDisclosure
            title="Captions and focus"
            description={
              fit === "cover" ? "Name each image and choose what stays in frame" : "Name each image"
            }
          >
            <ImageDetailsEditor />
          </WidgetConfigDisclosure>
        )}
        {error && <p className="text-destructive text-caption">{error}</p>}
      </WidgetConfigGroup>

      {isMulti && <ImageRotationGroup />}

      <ImageAppearanceGroup isMulti={isMulti} hasImages={hasImages} />
    </>
  );
}
