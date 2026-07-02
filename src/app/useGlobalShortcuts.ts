import { useEffect } from "react";
import { matchesAnyShortcut } from "@/lib/shortcuts";
import { isEditableTarget } from "@/lib/dom";
import {
  SHORTCUT_DEFINITIONS,
  useShortcutsStore,
  type ShortcutAction,
} from "@/stores/useShortcutsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useSettingsStore } from "@/settings/useSettingsStore";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";

const HANDLERS: Record<ShortcutAction, () => void> = {
  openSettings: () => {
    const settings = useSettingsStore.getState();
    if (settings.open) settings.closeSettings();
    else settings.openSettings();
  },
  openHelp: () => {
    const settings = useSettingsStore.getState();
    if (settings.open && settings.tab === "help") settings.closeSettings();
    else settings.openSettings("help");
  },
  toggleTheme: () => useThemeStore.getState().toggle(),
  editLayout: () => useDashboardStore.getState().toggleEditing(),
  addWidget: () => useWidgetPaletteStore.getState().toggle(),
  toggleGridLines: () => {
    const settings = useAppSettingsStore.getState();
    settings.setShowGridLines(!settings.showGridLines);
  },
};

export function useGlobalShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const target = event.target;
      const editable = isEditableTarget(target);

      if (event.key === "Escape" && !editable) {
        const dashboard = useDashboardStore.getState();
        if (dashboard.editing && !useSettingsStore.getState().open) {
          event.preventDefault();
          dashboard.toggleEditing();
        }
        return;
      }

      if (editable) return;

      const state = useShortcutsStore.getState();
      for (const definition of SHORTCUT_DEFINITIONS) {
        if (matchesAnyShortcut(event, state[definition.id])) {
          event.preventDefault();
          HANDLERS[definition.id]();
          return;
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
