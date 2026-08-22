import { Compass, Library, Rss } from "lucide-react";
import { AnilistServiceIcon } from "@/components/icons/service-icons";
import { useIntegrationStore } from "@/integrations";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useActivityUnseenCount, useUnreadCount } from "@/widgets/anilist/useAnilistSignals";
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
  const viewerId = Number(account?.providerAccountId);
  const unseen = useActivityUnseenCount(Boolean(connected), viewerId);
  const { count: unread } = useUnreadCount(Boolean(connected), viewerId);

  if (!connected) return <AnilistServiceIcon className="size-4" />;

  const tabs: WidgetTab<AnilistTab>[] = [
    { value: "feed", label: "Feed", icon: Rss, badge: unseen + unread },
    { value: "library", label: "Library", icon: Library },
    { value: "discover", label: "Discover", icon: Compass },
  ];

  return (
    <WidgetTabs tabs={tabs} value={activeTab} onSelect={(tab) => setActiveTab(instanceId, tab)} />
  );
}
