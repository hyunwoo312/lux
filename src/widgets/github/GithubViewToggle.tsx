import { Inbox, LayoutGrid } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { useGithubStore } from "@/widgets/github/useGithubStore";

export function GithubViewToggle() {
  const view = useGithubStore((s) => s.view);
  const setView = useGithubStore((s) => s.setView);
  const isContributions = view === "contributions";

  return (
    <ViewToggleButton
      targetKey={isContributions ? "inbox" : "contributions"}
      targetLabel={isContributions ? "inbox" : "contributions"}
      icon={isContributions ? Inbox : LayoutGrid}
      onToggle={() => setView(isContributions ? "inbox" : "contributions")}
    />
  );
}
