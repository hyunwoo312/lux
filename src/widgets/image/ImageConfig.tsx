import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ConfigMultiToggle,
  ConfigSegmented,
  ConfigSelect,
  WidgetConfigGroup,
  WidgetConfigItem,
  WidgetConfigSubItem,
} from "@/components/config/WidgetConfig";
import { ClearImagesButton } from "@/components/media/ClearImagesButton";
import { ImageUploadButton } from "@/components/media/ImageUploadButton";
import { MultiImageItems } from "@/components/media/MultiImageItems";
import { ImageDetailsEditor } from "@/widgets/image/ImageDetailsEditor";
import { useImageUploads } from "@/widgets/image/hooks/useImageUploads";
import { useSetImageAsBackground } from "@/widgets/image/hooks/useSetImageAsBackground";
import { imageAssetStore } from "@/widgets/image/media";
import { getMetadataLabel } from "@/lib/media-format";
import {
  MAX_MULTI_IMAGES,
  type ImageBrightness,
  type ImageFit,
  type ImageMode,
  type ImageOrder,
  type ImageTransition,
} from "@/widgets/image/types";
import { useImage, useImageStore } from "@/widgets/image/useImageStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

type RotationTrigger = "newtab" | "timed" | "onclick";

const MODE_OPTIONS: { value: ImageMode; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "multi", label: "Multi" },
];
const ROTATION_OPTIONS: { value: RotationTrigger; label: string }[] = [
  { value: "newtab", label: "New tab" },
  { value: "timed", label: "Timed" },
  { value: "onclick", label: "On click" },
];
const INTERVAL_OPTIONS: { value: string; label: string }[] = [
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "1m" },
  { value: "300", label: "5m" },
];
const ORDER_OPTIONS: { value: ImageOrder; label: string }[] = [
  { value: "shuffle", label: "Shuffle" },
  { value: "sequential", label: "Sequential" },
];
const FIT_OPTIONS: { value: ImageFit; label: string }[] = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
  { value: "scale-down", label: "Scale down" },
];
const BRIGHTNESS_OPTIONS: { value: ImageBrightness; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "dim", label: "Dim" },
  { value: "dark", label: "Dark" },
];
const TRANSITION_OPTIONS: { value: ImageTransition; label: string }[] = [
  { value: "crossfade", label: "Crossfade" },
  { value: "slide", label: "Slide" },
  { value: "none", label: "None" },
];

const BACKGROUND_LABELS: Record<ReturnType<typeof useSetImageAsBackground>["status"], string> = {
  idle: "Set as background",
  saving: "Setting…",
  done: "Background updated",
  error: "Couldn't set",
};

export function ImageConfig() {
  const instanceId = useWidgetInstanceId();
  const mode = useImage((c) => c.mode);
  const single = useImage((c) => c.single);
  const items = useImage((c) => c.items);
  const rotateOnNewtab = useImage((c) => c.rotateOnNewtab);
  const rotateTimed = useImage((c) => c.rotateTimed);
  const rotateOnClick = useImage((c) => c.rotateOnClick);
  const intervalSeconds = useImage((c) => c.intervalSeconds);
  const order = useImage((c) => c.order);
  const fit = useImage((c) => c.fit);
  const brightness = useImage((c) => c.brightness);
  const hideFrame = useImage((c) => c.hideFrame);
  const transition = useImage((c) => c.transition);
  const kenBurns = useImage((c) => c.kenBurns);
  const setMode = useImageStore((s) => s.setMode);
  const setItems = useImageStore((s) => s.setItems);
  const setRotateOnNewtab = useImageStore((s) => s.setRotateOnNewtab);
  const setRotateTimed = useImageStore((s) => s.setRotateTimed);
  const setRotateOnClick = useImageStore((s) => s.setRotateOnClick);
  const setIntervalSeconds = useImageStore((s) => s.setIntervalSeconds);
  const setOrder = useImageStore((s) => s.setOrder);
  const setFit = useImageStore((s) => s.setFit);
  const setBrightness = useImageStore((s) => s.setBrightness);
  const setHideFrame = useImageStore((s) => s.setHideFrame);
  const setTransition = useImageStore((s) => s.setTransition);
  const setKenBurns = useImageStore((s) => s.setKenBurns);

  const { saving, error, handleFiles, removeItem, clearAll } = useImageUploads();
  const { setAsBackground, canSet, status: backgroundStatus } = useSetImageAsBackground();

  const isMulti = mode === "multi";
  const hasImages = isMulti ? items.length > 0 : Boolean(single);
  const canAdd = !isMulti || items.length < MAX_MULTI_IMAGES;
  const triggerValues: RotationTrigger[] = [
    ...(rotateOnNewtab ? (["newtab"] as const) : []),
    ...(rotateTimed ? (["timed"] as const) : []),
    ...(rotateOnClick ? (["onclick"] as const) : []),
  ];
  const applyTriggers = (next: RotationTrigger[]) => {
    if (next.length === 0) return;
    setRotateOnNewtab(instanceId, next.includes("newtab"));
    setRotateTimed(instanceId, next.includes("timed"));
    setRotateOnClick(instanceId, next.includes("onclick"));
  };
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
        {hasImages && <ImageDetailsEditor />}
        {error && <p className="text-destructive text-xs">{error}</p>}
      </WidgetConfigGroup>

      {isMulti && (
        <WidgetConfigGroup label="Rotation">
          <WidgetConfigItem title="Change image" description="Pick at least one trigger">
            <ConfigMultiToggle
              label="Rotation triggers"
              values={triggerValues}
              options={ROTATION_OPTIONS}
              onChange={applyTriggers}
            />
            <WidgetConfigSubItem
              title="Interval"
              description="How often it rotates"
              disabled={!rotateTimed}
              control={
                <ConfigSelect
                  label="Rotation interval"
                  value={String(intervalSeconds)}
                  options={INTERVAL_OPTIONS}
                  onChange={(value) => setIntervalSeconds(instanceId, Number(value))}
                  disabled={!rotateTimed}
                />
              }
            />
          </WidgetConfigItem>
          <WidgetConfigItem
            title="Order"
            description="Sequential or random"
            control={
              <ConfigSegmented
                label="Rotation order"
                value={order}
                options={ORDER_OPTIONS}
                onChange={(value) => setOrder(instanceId, value)}
              />
            }
          />
        </WidgetConfigGroup>
      )}

      <WidgetConfigGroup label="Appearance">
        <WidgetConfigItem
          title="Fit"
          description="How the image fills the widget"
          control={
            <ConfigSelect
              label="Image fit"
              value={fit}
              options={FIT_OPTIONS}
              onChange={(value) => setFit(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Brightness"
          description="Overlay for contrast"
          control={
            <ConfigSegmented
              label="Image brightness"
              value={brightness}
              options={BRIGHTNESS_OPTIONS}
              onChange={(value) => setBrightness(instanceId, value)}
            />
          }
        />
        {isMulti && (
          <WidgetConfigItem
            title="Transition"
            description="How images change over"
            control={
              <ConfigSelect
                label="Image transition"
                value={transition}
                options={TRANSITION_OPTIONS}
                onChange={(value) => setTransition(instanceId, value)}
              />
            }
          />
        )}
        <WidgetConfigItem
          title="Ken Burns"
          description="Slow pan and zoom on the image"
          control={
            <Switch
              checked={kenBurns}
              onCheckedChange={(checked) => setKenBurns(instanceId, checked === true)}
              aria-label="Ken Burns effect"
            />
          }
        />
        <WidgetConfigItem
          title="Hide frame"
          description="Show only the image, hiding the card and header"
          control={
            <Switch
              checked={hideFrame}
              onCheckedChange={(checked) => setHideFrame(instanceId, checked === true)}
              aria-label="Hide image frame"
            />
          }
        />
        {hasImages && (
          <WidgetConfigItem
            title="Dashboard background"
            description="Use the current image as the page background"
            control={
              <Button
                variant="outline"
                size="sm"
                disabled={!canSet || backgroundStatus === "saving"}
                onClick={() => void setAsBackground()}
              >
                {BACKGROUND_LABELS[backgroundStatus]}
              </Button>
            }
          />
        )}
      </WidgetConfigGroup>
    </>
  );
}
