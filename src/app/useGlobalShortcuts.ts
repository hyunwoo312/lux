import { useEffect } from "react";
import { matchesAnyShortcut } from "@/lib/shortcuts";
import { isEditableTarget, isModalLayerOpen } from "@/lib/dom";
import {
  SHORTCUT_DEFINITIONS,
  useShortcutsStore,
  type ShortcutAction,
} from "@/stores/useShortcutsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useToastStore } from "@/stores/useToastStore";
import { useSettingsStore } from "@/settings";
import { useGuideStore } from "@/guide";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";

const HANDLERS: Record<ShortcutAction, () => void> = {
  openSettings: () => {
    const settings = useSettingsStore.getState();
    if (settings.open) settings.closeSettings();
    else settings.openSettings();
  },
  openGuide: () => {
    const guide = useGuideStore.getState();
    if (guide.open) guide.closeGuide();
    else guide.openGuide();
  },
  toggleTheme: () => useThemeStore.getState().toggle(),
  editLayout: () => useDashboardStore.getState().toggleEditing(),
  addWidget: () => useWidgetPaletteStore.getState().toggle(),
  toggleGridLines: () => {
    const settings = useAppSettingsStore.getState();
    settings.setShowGridLines(!settings.showGridLines);
  },
  undo: () => {
    const toasts = useToastStore.getState();
    if (toasts.toast?.action?.kind === "undo") toasts.runAction();
  },
};

function dismissTopLayer(): boolean {
  const toasts = useToastStore.getState();
  if (toasts.toast) {
    toasts.expire();
    return true;
  }
  const dashboard = useDashboardStore.getState();
  if (dashboard.editing) {
    dashboard.toggleEditing();
    return true;
  }
  return false;
}

export function useGlobalShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isModalLayerOpen()) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "Escape") {
        if (dismissTopLayer()) event.preventDefault();
        return;
      }

      const bindings = useShortcutsStore.getState();
      for (const definition of SHORTCUT_DEFINITIONS) {
        if (matchesAnyShortcut(event, bindings[definition.id])) {
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
