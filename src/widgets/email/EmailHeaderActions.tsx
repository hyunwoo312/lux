import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/motion";
import { EmailRefreshButton } from "@/widgets/email/EmailRefreshButton";
import { useMailAccounts } from "@/widgets/email/useMailAccounts";

export function EmailHeaderActions() {
  const reduced = useReducedMotion();
  const { connected } = useMailAccounts();

  return (
    <AnimatePresence initial={false}>
      {connected.length > 0 && (
        <motion.div
          key="refresh"
          className="overflow-hidden"
          initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto" }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
          transition={{ duration: reduced ? 0 : 0.18, ease: EASE_OUT }}
        >
          <EmailRefreshButton />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
