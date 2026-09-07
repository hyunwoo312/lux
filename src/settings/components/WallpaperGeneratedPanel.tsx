import { Switch } from "@/components/ui/switch";
import { SliderField } from "@/settings/components/SliderField";
import { WallpaperOverlay } from "@/settings/components/WallpaperImageOptions";
import {
  GENERATED_MAX_INTENSITY,
  GENERATED_MIN_INTENSITY,
  useWallpaperStore,
  type GeneratedStyle,
} from "@/stores/useWallpaperStore";
import { ConfigSegmented, ConfigRow } from "@/components/config/Config";

const STYLE_OPTIONS: { value: GeneratedStyle; label: string }[] = [
  { value: "mesh", label: "Mesh" },
  { value: "aurora", label: "Aurora" },
  { value: "bloom", label: "Bloom" },
  { value: "still", label: "Still" },
];

export function WallpaperGeneratedPanel() {
  const style = useWallpaperStore((s) => s.generatedStyle);
  const motion = useWallpaperStore((s) => s.generatedMotion);
  const intensity = useWallpaperStore((s) => s.generatedIntensity);
  const density = useWallpaperStore((s) => s.generatedDensity);
  const setStyle = useWallpaperStore((s) => s.setGeneratedStyle);
  const setMotion = useWallpaperStore((s) => s.setGeneratedMotion);
  const setIntensity = useWallpaperStore((s) => s.setGeneratedIntensity);
  const setDensity = useWallpaperStore((s) => s.setGeneratedDensity);
  const speed = useWallpaperStore((s) => s.generatedSpeed);
  const setSpeed = useWallpaperStore((s) => s.setGeneratedSpeed);

  const isStill = style === "still";

  return (
    <>
      <ConfigRow
        title="Style"
        description="Drawn by Lux, so it always matches your theme"
        control={
          <ConfigSegmented
            label="Wallpaper style"
            value={style}
            options={STYLE_OPTIONS}
            onChange={setStyle}
          />
        }
      />
      <ConfigRow
        title="Motion"
        description={isStill ? "Still has no motion" : "Slow drift, paused when the tab is hidden"}
        control={
          <Switch
            checked={motion && !isStill}
            onCheckedChange={setMotion}
            disabled={isStill}
            aria-label="Wallpaper motion"
          />
        }
      />
      <ConfigRow
        title="Intensity"
        description="How strong the pattern reads"
        control={
          <SliderField
            label="Pattern intensity"
            hideLabel
            className="w-40"
            value={intensity}
            min={GENERATED_MIN_INTENSITY}
            max={GENERATED_MAX_INTENSITY}
            step={0.05}
            display={`${Math.round(intensity * 100)}%`}
            onChange={setIntensity}
          />
        }
      />
      {style === "aurora" && (
        <ConfigRow
          title="Speed"
          description="How quickly the bands travel"
          control={
            <SliderField
              label="Aurora speed"
              hideLabel
              className="w-40"
              value={speed}
              min={GENERATED_MIN_INTENSITY}
              max={GENERATED_MAX_INTENSITY}
              step={0.05}
              display={`${Math.round(speed * 100)}%`}
              onChange={setSpeed}
            />
          }
        />
      )}
      {style === "mesh" && (
        <ConfigRow
          title="Shapes"
          description="How many polygons the mesh draws"
          control={
            <SliderField
              label="Shape count"
              hideLabel
              className="w-40"
              value={density}
              min={GENERATED_MIN_INTENSITY}
              max={GENERATED_MAX_INTENSITY}
              step={0.05}
              display={`${Math.round(density * 100)}%`}
              onChange={setDensity}
            />
          }
        />
      )}
      <WallpaperOverlay />
    </>
  );
}
