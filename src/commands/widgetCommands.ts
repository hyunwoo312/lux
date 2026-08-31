import { needsAccount, needsWidget } from "@/widgets/core/commandSetup";
import { widgetPlugins } from "@/widgets/registry";
import type { CommandSetup, WidgetCommand, WidgetPlugin, WidgetType } from "@/widgets/core/types";

export type AvailableWidgetCommand = WidgetCommand & {
  widget: string;
  widgetType: WidgetType;
  setupNeeded: CommandSetup | null;
};

function widgetDefault(plugin: WidgetPlugin): CommandSetup | null {
  const required = plugin.requiresAccount ?? [];
  if (required.length === 0) return needsWidget(plugin.type, plugin.name);
  for (const providerId of required) {
    const setup = needsAccount(providerId, plugin.name);
    if (setup) return setup;
  }
  return null;
}

export function availableWidgetCommands(): AvailableWidgetCommand[] {
  return widgetPlugins
    .filter((plugin) => plugin.commands)
    .flatMap((plugin) => {
      const fallback = widgetDefault(plugin);
      return (plugin.commands?.() ?? []).map((command) => ({
        ...command,
        widget: plugin.name,
        widgetType: plugin.type,
        keywords: [...(command.keywords ?? []), plugin.name],
        setupNeeded: command.setup === undefined ? fallback : command.setup(),
      }));
    });
}
