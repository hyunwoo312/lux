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
import { useCommandPaletteStore } from "@/palette";

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
};

export function runShortcutAction(action: ShortcutAction): void {
  HANDLERS[action]();
}

type DialogLayer = { isOpen: () => boolean; close: () => void };

const DIALOG_FOR: Partial<Record<ShortcutAction, DialogLayer>> = {
  openSettings: {
    isOpen: () => useSettingsStore.getState().open,
    close: () => useSettingsStore.getState().closeSettings(),
  },
  openGuide: {
    isOpen: () => useGuideStore.getState().open,
    close: () => useGuideStore.getState().closeGuide(),
  },
  addWidget: {
    isOpen: () => useWidgetPaletteStore.getState().open,
    close: () => useWidgetPaletteStore.getState().setOpen(false),
  },
};

const COMMAND_PALETTE: DialogLayer = {
  isOpen: () => useCommandPaletteStore.getState().open,
  close: () => useCommandPaletteStore.getState().closePalette(),
};

export function closeOpenDialogs(): void {
  for (const layer of [...Object.values(DIALOG_FOR), COMMAND_PALETTE]) {
    if (layer.isOpen()) layer.close();
  }
}

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
      if (event.defaultPrevented) return;
      const modalOpen = isModalLayerOpen();

      if (event.key === "Escape") {
        if (!isEditableTarget(event.target) && !modalOpen && dismissTopLayer())
          event.preventDefault();
        return;
      }

      const bindings = useShortcutsStore.getState();
      for (const definition of SHORTCUT_DEFINITIONS) {
        if (!matchesAnyShortcut(event, bindings[definition.id])) continue;
        const dialog = DIALOG_FOR[definition.id];
        if (modalOpen && dialog && !dialog.isOpen()) closeOpenDialogs();
        event.preventDefault();
        HANDLERS[definition.id]();
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
