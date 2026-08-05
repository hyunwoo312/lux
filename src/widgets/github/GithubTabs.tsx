import { Inbox, LayoutGrid, Tag } from "lucide-react";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { GithubView } from "@/widgets/github/types";

const TABS: WidgetTab<GithubView>[] = [
  { value: "contributions", label: "Contributions", icon: LayoutGrid },
  { value: "inbox", label: "Inbox", icon: Inbox },
  { value: "releases", label: "Releases", icon: Tag },
];

export function GithubTabs() {
  const instanceId = useWidgetInstanceId();
  const view = useGithub((d) => d.view);
  const setView = useGithubStore((s) => s.setView);

  return <WidgetTabs tabs={TABS} value={view} onSelect={(next) => setView(instanceId, next)} />;
}
