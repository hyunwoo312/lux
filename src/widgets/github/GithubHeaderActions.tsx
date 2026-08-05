import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useIntegrationStore } from "@/integrations";
import { GithubProfileLink } from "@/widgets/github/GithubProfileLink";
import { GithubRefreshButton } from "@/widgets/github/GithubRefreshButton";

export function GithubHeaderActions() {
  const reduced = useReducedMotion();
  const connected = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "github")?.status === "connected",
  );

  return (
    <div className="flex items-center gap-0.5">
      <GithubProfileLink />
      <AnimatePresence initial={false}>
        {connected && (
          <motion.div
            key="refresh"
            className="overflow-hidden"
            initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
          >
            <GithubRefreshButton />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
