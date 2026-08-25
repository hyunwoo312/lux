import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import { ConfigSegmented } from "@/components/config/WidgetConfig";
import { SettingsRow } from "@/settings/components/SettingsRow";
import {
  REFRESH_STEPS,
  useAppSettingsStore,
  type RefreshCadence,
} from "@/stores/useAppSettingsStore";
import { accentClass } from "@/widgets/core/accent";
import { widgetPlugins } from "@/widgets/registry";

const OPTIONS: { value: RefreshCadence; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "relaxed", label: "Relaxed" },
  { value: "custom", label: "Custom" },
];

const tunable = () => widgetPlugins.filter((plugin) => plugin.refreshMs !== undefined);

function duration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return hours === 1 ? "1 hour" : `${Number(hours.toFixed(1))} h`;
}

export function RefreshDefaults() {
  const cadence = useAppSettingsStore((s) => s.refreshCadence);
  const widgetRefresh = useAppSettingsStore((s) => s.widgetRefresh);
  const applyPreset = useAppSettingsStore((s) => s.applyRefreshPreset);
  const setWidgetRefresh = useAppSettingsStore((s) => s.setWidgetRefresh);

  const plugins = tunable();

  return (
    <>
      <SettingsRow
        title="How often widgets refresh"
        description="Relaxed halves every widget's rate."
        control={
          <ConfigSegmented
            label="Refresh cadence"
            value={cadence}
            options={OPTIONS}
            onChange={(next) => {
              if (next === "custom" || next === cadence) return;
              applyPreset(
                plugins.map((plugin) => plugin.type),
                next,
              );
            }}
          />
        }
      >
        <p className="text-ink-4 text-caption">
          Adjusting any widget below moves this to Custom. Default is as frequent as Lux goes — the
          built-in rates are set against each service’s own limits.
        </p>
      </SettingsRow>

      <ul className="flex flex-col gap-3">
        {plugins.map((plugin) => {
          const base = plugin.refreshMs ?? 0;
          const scale = widgetRefresh[plugin.type] ?? 1;
          const Icon = plugin.icon;

          return (
            <li key={plugin.type} className="flex items-center gap-3">
              <span
                className={cn(
                  "bg-foreground/5 grid size-8 shrink-0 place-items-center rounded-lg",
                  accentClass(plugin.tint),
                )}
              >
                <Icon className={cn("size-4", !plugin.brandIcon && "text-primary")} />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={TYPE.label}>{plugin.name}</span>
                <span className={TYPE.help}>Default is every {duration(base)}</span>
              </span>

              <ConfigSegmented
                label={`${plugin.name} refresh`}
                value={String(scale)}
                options={REFRESH_STEPS.map((step) => ({
                  value: String(step),
                  label: duration(base * step),
                }))}
                onChange={(next) => setWidgetRefresh(plugin.type, Number(next))}
              />
            </li>
          );
        })}
      </ul>

      <p className="text-ink-4 text-caption">
        Sports, Spotify and Stocks are not listed: they change their own rate as they go — faster
        while a game is live or a market is open — so there is no single interval to set. They still
        follow the preset above.
      </p>
    </>
  );
}
