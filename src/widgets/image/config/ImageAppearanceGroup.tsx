import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ConfigSegmented,
  ConfigSelect,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { useSetImageAsBackground } from "@/widgets/image/hooks/useSetImageAsBackground";
import { useImage, useImageStore } from "@/widgets/image/useImageStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { ImageBrightness, ImageFit, ImageTransition } from "@/widgets/image/types";

const FIT_OPTIONS: { value: ImageFit; label: string }[] = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "scale-down", label: "Scale down" },
  { value: "fill", label: "Stretch to fill" },
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

export function ImageAppearanceGroup({
  isMulti,
  hasImages,
}: {
  isMulti: boolean;
  hasImages: boolean;
}) {
  const instanceId = useWidgetInstanceId();
  const fit = useImage((c) => c.fit);
  const brightness = useImage((c) => c.brightness);
  const hideFrame = useImage((c) => c.hideFrame);
  const transition = useImage((c) => c.transition);
  const kenBurns = useImage((c) => c.kenBurns);
  const setFit = useImageStore((s) => s.setFit);
  const setBrightness = useImageStore((s) => s.setBrightness);
  const setHideFrame = useImageStore((s) => s.setHideFrame);
  const setTransition = useImageStore((s) => s.setTransition);
  const setKenBurns = useImageStore((s) => s.setKenBurns);
  const { setAsBackground, canSet, status } = useSetImageAsBackground();

  return (
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
              disabled={!canSet || status === "saving"}
              onClick={() => void setAsBackground()}
            >
              {BACKGROUND_LABELS[status]}
            </Button>
          }
        />
      )}
    </WidgetConfigGroup>
  );
}
