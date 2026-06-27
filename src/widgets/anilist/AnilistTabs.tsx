import { Inbox, Newspaper, PlayCircle } from "lucide-react";
import { AnilistServiceIcon } from "@/components/icons/service-icons";
import { useIntegrationStore } from "@/integrations";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import type { AnilistTab } from "@/widgets/anilist/types";

const TABS: WidgetTab<AnilistTab>[] = [
  { value: "activity", label: "Activity", icon: Newspaper },
  { value: "current", label: "Current", icon: PlayCircle },
  { value: "inbox", label: "Inbox", icon: Inbox },
];

export function AnilistTabs() {
  const connected = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "anilist")?.status === "connected",
  );
  const activeTab = useAnilistStore((s) => s.activeTab);
  const setActiveTab = useAnilistStore((s) => s.setActiveTab);

  if (!connected) return <AnilistServiceIcon className="size-4" />;

  return <WidgetTabs tabs={TABS} value={activeTab} onSelect={setActiveTab} />;
}
