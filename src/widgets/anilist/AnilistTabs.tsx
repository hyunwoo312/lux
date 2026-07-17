import { Compass, Inbox, Newspaper, PlayCircle } from "lucide-react";
import { AnilistServiceIcon } from "@/components/icons/service-icons";
import { useIntegrationStore } from "@/integrations";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useAnilistSignals } from "@/widgets/anilist/useAnilistSignals";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { AnilistTab } from "@/widgets/anilist/types";

export function AnilistTabs() {
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "anilist") ?? null,
  );
  const connected = account?.status === "connected";
  const instanceId = useWidgetInstanceId();
  const activeTab = useAnilist((d) => d.activeTab);
  const setActiveTab = useAnilistStore((s) => s.setActiveTab);
  const { activityNew, inboxUnread } = useAnilistSignals(
    Boolean(connected),
    Number(account?.providerAccountId),
  );

  if (!connected) return <AnilistServiceIcon className="size-4" />;

  const tabs: WidgetTab<AnilistTab>[] = [
    { value: "activity", label: "Activity", icon: Newspaper, badge: activityNew },
    { value: "current", label: "Current", icon: PlayCircle },
    { value: "inbox", label: "Inbox", icon: Inbox, badge: inboxUnread },
    { value: "discover", label: "Discover", icon: Compass },
  ];

  return (
    <WidgetTabs tabs={tabs} value={activeTab} onSelect={(tab) => setActiveTab(instanceId, tab)} />
  );
}
