import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useProviderAccount } from "@/integrations";
import { useGithub } from "@/widgets/github/useGithubStore";
import { ContributionsView } from "@/widgets/github/components/ContributionsView";
import { InboxView } from "@/widgets/github/components/InboxView";
import { ReleasesView } from "@/widgets/github/components/ReleasesView";
import { GithubSignedOutPreview } from "@/widgets/github/components/GithubSignedOutPreview";
import { viewSwap } from "@/lib/motion";
import type { GithubView } from "@/widgets/github/types";

function ActiveView({
  view,
  enabled,
  showPrivate,
}: {
  view: GithubView;
  enabled: boolean;
  showPrivate: boolean;
}) {
  if (view === "inbox") return <InboxView enabled={enabled} showPrivate={showPrivate} />;
  if (view === "releases") return <ReleasesView enabled={enabled} showPrivate={showPrivate} />;
  return <ContributionsView enabled={enabled} />;
}

export function GithubWidget() {
  const reduced = useReducedMotion();
  const { account, loaded } = useProviderAccount("github");
  const view = useGithub((d) => d.view);
  const showPrivate = useGithub((d) => d.showPrivate);

  const connected = account?.status === "connected";

  if (loaded && !connected) {
    return <GithubSignedOutPreview />;
  }

  return (
    <div className="relative h-full min-h-0">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div key={view} className="absolute inset-0" {...viewSwap(reduced)}>
          <ActiveView view={view} enabled={connected} showPrivate={showPrivate} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
