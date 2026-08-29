import { collapse } from "@/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useIsConnected } from "@/integrations";
import { GithubProfileLink } from "@/widgets/github/GithubProfileLink";
import { GithubRefreshButton } from "@/widgets/github/GithubRefreshButton";

export function GithubHeaderActions() {
  const reduced = useReducedMotion();
  const connected = useIsConnected("github");

  return (
    <div className="flex items-center gap-0.5">
      <GithubProfileLink />
      <AnimatePresence initial={false}>
        {connected && (
          <motion.div key="refresh" className="overflow-hidden" {...collapse(reduced, "width")}>
            <GithubRefreshButton />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
