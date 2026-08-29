import {
  ConfigMultiToggle,
  ConfigSegmented,
  ConfigSelect,
  WidgetConfigGroup,
  WidgetConfigItem,
  WidgetConfigSubItem,
} from "@/components/config/WidgetConfig";
import { useImage, useImageStore } from "@/widgets/image/useImageStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { ImageOrder } from "@/widgets/image/types";

type RotationTrigger = "newtab" | "timed" | "onclick";

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

export function ImageRotationGroup() {
  const instanceId = useWidgetInstanceId();
  const rotateOnNewtab = useImage((c) => c.rotateOnNewtab);
  const rotateTimed = useImage((c) => c.rotateTimed);
  const rotateOnClick = useImage((c) => c.rotateOnClick);
  const intervalSeconds = useImage((c) => c.intervalSeconds);
  const order = useImage((c) => c.order);
  const setRotateOnNewtab = useImageStore((s) => s.setRotateOnNewtab);
  const setRotateTimed = useImageStore((s) => s.setRotateTimed);
  const setRotateOnClick = useImageStore((s) => s.setRotateOnClick);
  const setIntervalSeconds = useImageStore((s) => s.setIntervalSeconds);
  const setOrder = useImageStore((s) => s.setOrder);

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

  return (
    <WidgetConfigGroup label="Rotation">
      <WidgetConfigItem title="Change image" description="Pick at least one trigger">
        <ConfigMultiToggle
          label="Rotation triggers"
          values={triggerValues}
          options={ROTATION_OPTIONS}
          minSelected={1}
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
  );
}
