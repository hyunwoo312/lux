import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { GitHubServiceIcon } from "@/components/icons/service-icons";
import { useSettingsStore } from "@/settings";
import { useIntegrationStore } from "@/integrations";
import { useGithub } from "@/widgets/github/useGithubStore";
import { ContributionsView } from "@/widgets/github/components/ContributionsView";
import { InboxView } from "@/widgets/github/components/InboxView";
import { GithubConnectPrompt } from "@/widgets/github/components/GithubConnectPrompt";
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
    return (
      <GithubConnectPrompt
        icon={GitHubServiceIcon}
        message={
          account
            ? "Reconnect GitHub to see your activity."
            : "Connect GitHub to see your activity."
        }
        actionLabel="Manage in Settings"
        onAction={() => useSettingsStore.getState().openSettings("accounts")}
      />
    );
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
