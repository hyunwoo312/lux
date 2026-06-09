import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ConfigSegmented,
  ConfigSelect,
  WidgetConfigSubItem,
} from "@/components/config/WidgetConfig";
import { ClearImagesButton } from "@/components/media/ClearImagesButton";
import { ImageUploadButton } from "@/components/media/ImageUploadButton";
import { MultiImageItems } from "@/components/media/MultiImageItems";
import { getMetadataLabel } from "@/lib/media-format";
import { useWallpaperUploads } from "@/app/useWallpaperUploads";
import { SettingsRow } from "@/settings/components/SettingsRow";
import {
  MAX_WALLPAPER_IMAGES,
  WALLPAPER_MAX_BLUR,
  WALLPAPER_MAX_DIM,
  useWallpaperStore,
  wallpaperAssets,
  type WallpaperFit,
  type WallpaperMode,
  type WallpaperOrder,
} from "@/stores/useWallpaperStore";

const MODE_OPTIONS: { value: WallpaperMode; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "multi", label: "Multi" },
];
const ORDER_OPTIONS: { value: WallpaperOrder; label: string }[] = [
  { value: "shuffle", label: "Shuffle" },
  { value: "sequential", label: "Sequential" },
];
const FIT_OPTIONS: { value: WallpaperFit; label: string }[] = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
  { value: "scale-down", label: "Scale down" },
];
const INTERVAL_OPTIONS: { value: string; label: string }[] = [
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "1m" },
  { value: "300", label: "5m" },
];

export function BackgroundSetting() {
  const enabled = useWallpaperStore((s) => s.enabled);
  const mode = useWallpaperStore((s) => s.mode);
  const single = useWallpaperStore((s) => s.single);
  const items = useWallpaperStore((s) => s.items);
  const rotateOnNewtab = useWallpaperStore((s) => s.rotateOnNewtab);
  const rotateTimed = useWallpaperStore((s) => s.rotateTimed);
  const intervalSeconds = useWallpaperStore((s) => s.intervalSeconds);
  const order = useWallpaperStore((s) => s.order);
  const fit = useWallpaperStore((s) => s.fit);
  const dim = useWallpaperStore((s) => s.dim);
  const blur = useWallpaperStore((s) => s.blur);
  const setEnabled = useWallpaperStore((s) => s.setEnabled);
  const setMode = useWallpaperStore((s) => s.setMode);
  const setItems = useWallpaperStore((s) => s.setItems);
  const setRotateOnNewtab = useWallpaperStore((s) => s.setRotateOnNewtab);
  const setRotateTimed = useWallpaperStore((s) => s.setRotateTimed);
  const setIntervalSeconds = useWallpaperStore((s) => s.setIntervalSeconds);
  const setOrder = useWallpaperStore((s) => s.setOrder);
  const setFit = useWallpaperStore((s) => s.setFit);
  const setDim = useWallpaperStore((s) => s.setDim);
  const setBlur = useWallpaperStore((s) => s.setBlur);

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
    <>
      <SettingsRow
        title="Custom background"
        description="Use an uploaded image behind the dashboard"
        control={<Switch checked={enabled} onCheckedChange={setEnabled} />}
      />

      <div className={cn("flex flex-col gap-4", !enabled && "pointer-events-none opacity-50")}>
        <SettingsRow
          title="Mode"
          description="One image or a rotating set"
          control={
            <ConfigSegmented
              label="Background mode"
              value={mode}
              options={MODE_OPTIONS}
              onChange={setMode}
            />
          }
        />

        <SettingsRow
          title={isMulti ? "Images" : "Image"}
          control={
            hasImages ? (
              <ClearImagesButton
                label={isMulti ? "Clear images" : "Clear image"}
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
          {error && <p className="text-destructive text-xs">{error}</p>}
        </SettingsRow>

        {isMulti && (
          <div className="flex flex-col gap-3">
            <span className="
              text-muted-foreground/70 text-2xs font-semibold tracking-wider uppercase
            ">
              Rotation
            </span>
            <SettingsRow
              title="Change on new tab"
              description="A new image each time you open a tab"
              control={
                <Switch
                  checked={rotateOnNewtab}
                  onCheckedChange={setRotateOnNewtab}
                  aria-label="Change on new tab"
                />
              }
            />
            <SettingsRow
              title="Change on a timer"
              description="Rotate automatically while open"
              control={
                <Switch
                  checked={rotateTimed}
                  onCheckedChange={setRotateTimed}
                  aria-label="Change on a timer"
                />
              }
            />
            <WidgetConfigSubItem
              title="Interval"
              description="How often it changes"
              disabled={!rotateTimed}
              control={
                <ConfigSelect
                  label="Rotation interval"
                  value={String(intervalSeconds)}
                  options={INTERVAL_OPTIONS}
                  onChange={(value) => setIntervalSeconds(Number(value))}
                  disabled={!rotateTimed}
                />
              }
            />
            <SettingsRow
              title="Order"
              description="Sequential or random"
              control={
                <ConfigSegmented
                  label="Rotation order"
                  value={order}
                  options={ORDER_OPTIONS}
                  onChange={setOrder}
                />
              }
            />
          </div>
        )}

        <SettingsRow
          title="Fit"
          description="How the image fills the screen"
          control={
            <ConfigSelect
              label="Background fit"
              value={fit}
              options={FIT_OPTIONS}
              onChange={setFit}
            />
          }
        />

        <SettingsRow title="Overlay" description="Darken or blur for legibility">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SliderField
              label="Dim"
              value={dim}
              min={0}
              max={WALLPAPER_MAX_DIM}
              step={0.05}
              display={`${Math.round(dim * 100)}%`}
              onChange={setDim}
            />
            <SliderField
              label="Blur"
              value={blur}
              min={0}
              max={WALLPAPER_MAX_BLUR}
              step={1}
              display={`${blur}px`}
              onChange={setBlur}
            />
          </div>
        </SettingsRow>
      </div>
    </>
  );
}

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
};

function SliderField({ label, value, min, max, step, display, onChange }: SliderFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-medium tabular-nums">{display}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => next !== undefined && onChange(next)}
        aria-label={label}
      />
    </div>
  );
}
