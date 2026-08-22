import { Inbox, LayoutGrid, Tag } from "lucide-react";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { useInboxAttention } from "@/widgets/github/hooks/useInboxAttention";
import { useReleasesUnseen } from "@/widgets/github/hooks/useReleasesUnseen";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { GithubView } from "@/widgets/github/types";

export function GithubTabs() {
  const instanceId = useWidgetInstanceId();
  const view = useGithub((d) => d.view);
  const setView = useGithubStore((s) => s.setView);
  const waiting = useInboxAttention();
  const unseenReleases = useReleasesUnseen();

  const tabs: WidgetTab<GithubView>[] = [
    { value: "contributions", label: "Contributions", icon: LayoutGrid },
    { value: "inbox", label: "Inbox", icon: Inbox, badge: waiting },
    { value: "releases", label: "Releases", icon: Tag, badge: unseenReleases },
  ];

  return <WidgetTabs tabs={tabs} value={view} onSelect={(next) => setView(instanceId, next)} />;
}
