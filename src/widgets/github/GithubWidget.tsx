import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useIntegrationStore } from "@/integrations";
import { useGithub } from "@/widgets/github/useGithubStore";
import { ContributionsView } from "@/widgets/github/components/ContributionsView";
import { InboxView } from "@/widgets/github/components/InboxView";
import { GithubSignedOutPreview } from "@/widgets/github/components/GithubSignedOutPreview";
import { EASE_OUT_QUINT } from "@/lib/motion";

export function GithubWidget() {
  const reduced = useReducedMotion();
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "github") ?? null,
  );
  const loaded = useIntegrationStore((s) => s.loaded);
  const load = useIntegrationStore((s) => s.load);
  const view = useGithub((d) => d.view);
  const showPrivate = useGithub((d) => d.showPrivate);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const connected = account?.status === "connected";

  if (loaded && !connected) {
    return <GithubSignedOutPreview />;
  }

  const transition = { duration: reduced ? 0 : 0.3, ease: EASE_OUT_QUINT };

  return (
    <div className="relative h-full min-h-0">
      <AnimatePresence initial={false} mode="popLayout">
        {view === "inbox" ? (
          <motion.div
            key="inbox"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <InboxView enabled={Boolean(connected)} showPrivate={showPrivate} />
          </motion.div>
        ) : (
          <motion.div
            key="contributions"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <ContributionsView enabled={Boolean(connected)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
