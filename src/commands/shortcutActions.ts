import { useChangelogStore } from "@/changelog";
import { useFeedbackStore } from "@/feedback";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useGuideStore } from "@/stores/useGuideStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ShortcutAction } from "@/stores/useShortcutsStore";
import { useThemeStore } from "@/stores/useThemeStore";
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
  whatsNew: () => {
    const changelog = useChangelogStore.getState();
    changelog.setOpen(!changelog.open);
  },
  sendFeedback: () => {
    const feedback = useFeedbackStore.getState();
    feedback.setOpen(!feedback.open);
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
