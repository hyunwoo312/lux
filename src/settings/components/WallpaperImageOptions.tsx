import { Switch } from "@/components/ui/switch";
import {
  ConfigSegmented,
  ConfigSelect,
  WidgetConfigSubItem,
} from "@/components/config/WidgetConfig";
import { SettingsRow } from "@/settings/components/SettingsRow";
import { SliderField } from "@/settings/components/SliderField";
import {
  WALLPAPER_MAX_BLUR,
  WALLPAPER_MAX_DIM,
  useWallpaperStore,
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

export function WallpaperImageOptions() {
  const mode = useWallpaperStore((s) => s.mode);
  const rotateOnNewtab = useWallpaperStore((s) => s.rotateOnNewtab);
  const rotateTimed = useWallpaperStore((s) => s.rotateTimed);
  const intervalSeconds = useWallpaperStore((s) => s.intervalSeconds);
  const order = useWallpaperStore((s) => s.order);
  const fit = useWallpaperStore((s) => s.fit);
  const setMode = useWallpaperStore((s) => s.setMode);
  const setRotateOnNewtab = useWallpaperStore((s) => s.setRotateOnNewtab);
  const setRotateTimed = useWallpaperStore((s) => s.setRotateTimed);
  const setIntervalSeconds = useWallpaperStore((s) => s.setIntervalSeconds);
  const setOrder = useWallpaperStore((s) => s.setOrder);
  const setFit = useWallpaperStore((s) => s.setFit);

  const isSingle = mode === "single";

  return (
    <>
      <SettingsRow
        title="Mode"
        description="One wallpaper or a rotating set"
        control={
          <ConfigSegmented
            label="Wallpaper mode"
            value={mode}
            options={MODE_OPTIONS}
            onChange={setMode}
          />
        }
      />

      <WidgetConfigSubItem
        title="Change on new tab"
        description="A different one each time you open a tab"
        disabled={isSingle}
        control={
          <Switch
            checked={rotateOnNewtab}
            onCheckedChange={setRotateOnNewtab}
            disabled={isSingle}
            aria-label="Change on new tab"
          />
        }
      />
      <WidgetConfigSubItem
        title="Change on a timer"
        description="Rotate automatically while the tab stays open"
        disabled={isSingle}
        control={
          <Switch
            checked={rotateTimed}
            onCheckedChange={setRotateTimed}
            disabled={isSingle}
            aria-label="Change on a timer"
          />
        }
      />
      <WidgetConfigSubItem
        title="Interval"
        description="How often it changes"
        disabled={isSingle || !rotateTimed}
        control={
          <ConfigSelect
            label="Rotation interval"
            value={String(intervalSeconds)}
            options={INTERVAL_OPTIONS}
            onChange={(value) => setIntervalSeconds(Number(value))}
            disabled={isSingle || !rotateTimed}
          />
        }
      />
      <WidgetConfigSubItem
        title="Order"
        description="Sequential or random"
        disabled={isSingle}
        control={
          <ConfigSegmented
            label="Rotation order"
            value={order}
            options={ORDER_OPTIONS}
            onChange={setOrder}
            disabled={isSingle}
          />
        }
      />

      <SettingsRow
        title="Fit"
        description="How the image fills the screen"
        control={
          <ConfigSelect label="Wallpaper fit" value={fit} options={FIT_OPTIONS} onChange={setFit} />
        }
      />

      <WallpaperOverlay showBlur />
    </>
  );
}

export function WallpaperOverlay({ showBlur = false }: { showBlur?: boolean }) {
  const dim = useWallpaperStore((s) => s.dim);
  const blur = useWallpaperStore((s) => s.blur);
  const setDim = useWallpaperStore((s) => s.setDim);
  const setBlur = useWallpaperStore((s) => s.setBlur);

  return (
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
        {showBlur && (
          <SliderField
            label="Blur"
            value={blur}
            min={0}
            max={WALLPAPER_MAX_BLUR}
            step={1}
            display={`${blur}px`}
            onChange={setBlur}
          />
        )}
      </div>
    </SettingsRow>
  );
}
