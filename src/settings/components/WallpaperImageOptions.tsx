import { Switch } from "@/components/ui/switch";
import { SliderField } from "@/settings/components/SliderField";
import {
  WALLPAPER_MAX_BLUR,
  WALLPAPER_MAX_DIM,
  useWallpaperStore,
  type WallpaperFit,
  type WallpaperMode,
  type WallpaperOrder,
} from "@/stores/useWallpaperStore";
import { ConfigSegmented, ConfigSelect, ConfigSubRow, ConfigRow } from "@/components/config/Config";
import { WALLPAPER } from "@/settings/rows";

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
      <ConfigRow
        {...WALLPAPER.rows.mode}
        control={
          <ConfigSegmented
            label="Wallpaper mode"
            value={mode}
            options={MODE_OPTIONS}
            onChange={setMode}
          />
        }
      />

      <ConfigSubRow
        {...WALLPAPER.rows.newTab}
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
      <ConfigSubRow
        {...WALLPAPER.rows.timer}
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
      <ConfigSubRow
        {...WALLPAPER.rows.interval}
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
      <ConfigSubRow
        {...WALLPAPER.rows.order}
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

      <ConfigRow
        {...WALLPAPER.rows.fit}
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
    <ConfigRow {...WALLPAPER.rows.overlay}>
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
    </ConfigRow>
  );
}
