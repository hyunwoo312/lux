import { CalendarDays } from "lucide-react";
import { useIntegrationStore } from "@/integrations";
import { useSettingsStore } from "@/settings";
import type { WidgetPlugin } from "@/widgets/core/types";
import { CalendarWidget } from "@/widgets/calendar/CalendarWidget";
import { CalendarConfig } from "@/widgets/calendar/CalendarConfig";
import { CalendarHeaderActions } from "@/widgets/calendar/CalendarHeaderActions";
import { CalendarStatus } from "@/widgets/calendar/CalendarStatus";

export const calendarPlugin: WidgetPlugin = {
  type: "calendar",
  name: "Calendar",
  description: "Your upcoming schedule at a glance",
  icon: CalendarDays,
  defaultLayout: { w: 8, h: 9, minW: 6, minH: 6, maxW: 14, maxH: 14 },
  component: CalendarWidget,
  configComponent: CalendarConfig,
  statusComponent: CalendarStatus,
  headerActionComponent: CalendarHeaderActions,
  accent: "orange",
  useLock: () => {
    const loaded = useIntegrationStore((s) => s.loaded);
    const hasAccount = useIntegrationStore((s) =>
      s.accounts.some(
        (account) => account.providerId === "google" || account.providerId === "microsoft",
      ),
    );
    const connected = useIntegrationStore((s) =>
      s.accounts.some(
        (account) =>
          (account.providerId === "google" || account.providerId === "microsoft") &&
          account.status === "connected",
      ),
    );
    if (!loaded || connected) return null;
    return {
      message: hasAccount
        ? "Reconnect your calendar to see your schedule."
        : "Connect a calendar to see your schedule.",
      actionLabel: hasAccount ? "Reconnect" : "Connect",
      onAction: () => useSettingsStore.getState().openSettings("accounts"),
    };
  },
  removalNote: () => "Its calendar selection will be reset — your accounts stay connected.",
};
