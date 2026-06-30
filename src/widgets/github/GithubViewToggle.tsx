import { Inbox, LayoutGrid } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function GithubViewToggle() {
  const instanceId = useWidgetInstanceId();
  const view = useGithub((d) => d.view);
  const setView = useGithubStore((s) => s.setView);
  const isContributions = view === "contributions";

  return (
    <ViewToggleButton
      targetKey={isContributions ? "inbox" : "contributions"}
      targetLabel={isContributions ? "inbox" : "contributions"}
      icon={isContributions ? Inbox : LayoutGrid}
      onToggle={() => setView(instanceId, isContributions ? "inbox" : "contributions")}
    />
  );
}
