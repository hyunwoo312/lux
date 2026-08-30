import { useIntegrationStore, type IntegrationProviderId } from "@/integrations";
import { useSettingsStore } from "@/settings";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { instanceIds } from "@/widgets/core/instances";
import type { CommandSetup, WidgetType } from "@/widgets/core/types";

export function needsAccount(
  providerId: IntegrationProviderId,
  label: string,
): CommandSetup | null {
  const connected = useIntegrationStore
    .getState()
    .accounts.some(
      (account) => account.providerId === providerId && account.status === "connected",
    );
  if (connected) return null;
  return {
    reason: `Connect ${label}`,
    run: () => useSettingsStore.getState().openSettings("accounts"),
  };
}

export function needsWidget(type: WidgetType, name: string): CommandSetup | null {
  if (instanceIds(type).length > 0) return null;
  return {
    reason: `Add the ${name} widget`,
    run: () => useDashboardStore.getState().addWidget(type),
  };
}
