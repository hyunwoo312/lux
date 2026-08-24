import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ConfigSegmented } from "@/components/config/WidgetConfig";
import { SettingsRow } from "@/settings/components/SettingsRow";
import { useDashboardStore } from "@/stores/useDashboardStore";
import {
  useWidgetSettingsStore,
  type SurfacePreference,
  type WidgetBackground,
} from "@/widgets/core/useWidgetSettingsStore";

const OPTIONS: { value: SurfacePreference; label: string; disabled?: boolean }[] = [
  { value: "glass", label: "Glass" },
  { value: "solid", label: "Solid" },
  { value: "custom", label: "Custom", disabled: true },
];

function describe(background: WidgetBackground, count: number): string {
  const widgets = count === 1 ? "widget" : "widgets";
  return background === "glass"
    ? `Every one of your ${count} ${widgets} will switch to the frosted glass surface, replacing any surface you picked for a widget individually.`
    : `Every one of your ${count} ${widgets} will switch to the solid surface, replacing any surface you picked for a widget individually.`;
}

export function SurfaceDefault() {
  const preference = useWidgetSettingsStore((s) => s.surfacePreference);
  const applyToAll = useWidgetSettingsStore((s) => s.applyBackgroundToAll);
  const widgets = useDashboardStore((s) => s.widgets);
  const [pending, setPending] = useState<WidgetBackground | null>(null);

  const choose = (next: SurfacePreference) => {
    if (next === "custom" || next === preference) return;
    setPending(next);
  };

  const note =
    preference === "custom"
      ? "Custom, because at least one widget has its own surface. Pick Glass or Solid to reset them all."
      : "Changing one widget from its own settings moves this to Custom.";

  return (
    <>
      <SettingsRow
        title="Surface"
        description="Glass or solid for every widget at once."
        control={
          <ConfigSegmented
            label="Widget surface"
            value={preference}
            options={OPTIONS}
            onChange={choose}
          />
        }
      >
        <p className="text-ink-4 text-caption">{note}</p>
      </SettingsRow>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending === "solid" ? "Make every widget solid?" : "Make every widget glass?"}
        description={pending ? describe(pending, widgets.length) : ""}
        confirmLabel={pending === "solid" ? "Make all solid" : "Make all glass"}
        onConfirm={() => {
          if (pending)
            applyToAll(
              widgets.map((widget) => widget.id),
              pending,
            );
          setPending(null);
        }}
      />
    </>
  );
}
