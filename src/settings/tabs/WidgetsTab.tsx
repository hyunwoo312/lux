import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useSettingsStore } from "@/settings/useSettingsStore";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { accentClass } from "@/widgets/core/accent";
import {
  WIDGET_CATEGORIES,
  WIDGET_CATEGORY_LABELS,
  type WidgetCategory,
  type WidgetPlugin,
} from "@/widgets/core/types";
import { widgetPlugins } from "@/widgets/registry";

const COUNT_CHIP =
  "bg-primary/12 text-primary rounded-sm px-1.5 text-micro font-medium tabular-nums";

function WidgetRow({ plugin, count }: { plugin: WidgetPlugin; count: number }) {
  const addWidget = useDashboardStore((s) => s.addWidget);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const Icon = plugin.icon;

  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "bg-foreground/5 grid size-9 shrink-0 place-items-center rounded-lg",
          accentClass(plugin.accent),
        )}
      >
        <Icon className={cn("size-4.5", !plugin.brandIcon && "text-primary")} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className={TYPE.label}>{plugin.name}</span>
          {count > 0 && (
            <span className={COUNT_CHIP} title={`${count} on your dashboard`}>
              {count}
            </span>
          )}
        </span>
        <span className={TYPE.help}>{plugin.description}</span>
      </span>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        aria-label={`Add ${plugin.name}`}
        onClick={() => {
          addWidget(plugin.type);
          closeSettings();
        }}
      >
        <Plus aria-hidden />
        Add
      </Button>
    </li>
  );
}

export function WidgetsTab() {
  const widgets = useDashboardStore((s) => s.widgets);

  const counts = useMemo(() => {
    const tally = new Map<string, number>();
    for (const widget of widgets) tally.set(widget.type, (tally.get(widget.type) ?? 0) + 1);
    return tally;
  }, [widgets]);

  const byCategory = useMemo(() => {
    const grouped = new Map<WidgetCategory, WidgetPlugin[]>();
    for (const category of WIDGET_CATEGORIES) grouped.set(category, []);
    for (const plugin of widgetPlugins) grouped.get(plugin.category)?.push(plugin);
    return grouped;
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {WIDGET_CATEGORIES.map((category) => {
        const plugins = byCategory.get(category) ?? [];
        if (plugins.length === 0) return null;

        return (
          <SettingsSection key={category} title={WIDGET_CATEGORY_LABELS[category]}>
            <ul className="flex flex-col gap-4">
              {plugins.map((plugin) => (
                <WidgetRow key={plugin.type} plugin={plugin} count={counts.get(plugin.type) ?? 0} />
              ))}
            </ul>
          </SettingsSection>
        );
      })}

      <p className="text-ink-3 text-caption">
        Each widget keeps its own settings behind the gear in its header, on the dashboard. You can
        add more than one of the same widget.
      </p>
    </div>
  );
}
