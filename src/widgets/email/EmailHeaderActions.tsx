import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { collapse } from "@/lib/motion";
import { EmailRefreshButton } from "@/widgets/email/EmailRefreshButton";
import { useMailAccounts } from "@/widgets/email/useMailAccounts";

export function EmailHeaderActions() {
  const reduced = useReducedMotion();
  const { connected } = useMailAccounts();

  return (
    <AnimatePresence initial={false}>
      {connected.length > 0 && (
        <motion.div key="refresh" className="overflow-hidden" {...collapse(reduced, "width")}>
          <EmailRefreshButton />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
