import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DURATION, EASE_IN, EASE_OUT, SPRING_SOFT } from "@/lib/motion";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useIntegrationStore } from "@/integrations";
import { buildDiagnostics } from "@/feedback/lib/diagnostics";
import { submitFeedback } from "@/feedback/lib/submit";
import { FeedbackForm } from "@/feedback/components/FeedbackForm";
import { SentPanel } from "@/feedback/components/SentPanel";
import { SendingPanel } from "@/feedback/components/SendingPanel";
import { useMeasuredHeight } from "@/feedback/lib/useMeasuredHeight";
import { messageHash, useFeedbackStore } from "@/feedback/useFeedbackStore";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

function viewVariants(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        duration: reduced ? 0 : DURATION.base,
        ease: EASE_OUT,
        delay: reduced ? 0 : 0.06,
      },
    },
    exit: { opacity: 0, transition: { duration: reduced ? 0 : DURATION.fast, ease: EASE_IN } },
  };
}

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "settling"; id: string }
  | { kind: "sent"; id: string }
  | { kind: "error"; message: string; retryable: boolean };

function useDiagnostics() {
  const widgets = useDashboardStore((s) => s.widgets);
  const accounts = useIntegrationStore((s) => s.accounts);
  return buildDiagnostics({
    version: chrome.runtime?.getManifest?.().version ?? "dev",
    userAgent: navigator.userAgent,
    isBrave: "brave" in navigator,
    widgetTypes: widgets.map((widget) => widget.type),
    connectedProviders: accounts
      .filter((account) => account.status === "connected")
      .map((account) => account.providerId),
  });
}

export function FeedbackDialog({ open, onOpenChange }: Props) {
  const reduced = useReducedMotion() ?? false;
  const clearDraft = useFeedbackStore((s) => s.clearDraft);
  const recordSent = useFeedbackStore((s) => s.recordSent);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [restored, setRestored] = useState(false);
  const diagnostics = useDiagnostics();
  const [viewRef, viewHeight] = useMeasuredHeight<HTMLDivElement>();

  useEffect(() => {
    if (!open) return;
    setStatus({ kind: "idle" });
    setRestored(useFeedbackStore.getState().draft.message.trim().length > 0);
  }, [open]);

  const sending = status.kind === "sending";
  const settling = status.kind === "settling";
  const inFlight = sending || settling;
  const settled = status.kind === "sent";

  const send = async (): Promise<void> => {
    const { draft } = useFeedbackStore.getState();
    const message = draft.message.trim();
    setStatus({ kind: "sending" });

    const result = await submitFeedback({
      category: draft.category,
      message,
      ...(draft.includeDiagnostics ? { diagnostics } : {}),
    });

    if (result.ok) {
      recordSent(messageHash(message), Date.now());
      clearDraft();
      setRestored(false);
      setStatus({ kind: "settling", id: result.id });
      return;
    }
    setStatus({ kind: "error", message: result.message, retryable: result.retryable });
  };

  const handleSettled = useCallback(
    () => setStatus((s) => (s.kind === "settling" ? { kind: "sent", id: s.id } : s)),
    [],
  );

  const handleStartOver = useCallback(() => {
    clearDraft();
    setRestored(false);
  }, [clearDraft]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && inFlight) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        layout="flush"
        showClose={false}
        dismissOnClickOutside={!inFlight}
        className="w-[min(32.5rem,calc(100vw-2rem))]"
      >
        <motion.div
          className="relative overflow-hidden"
          initial={false}
          animate={{ height: viewHeight ?? "auto" }}
          transition={reduced ? { duration: 0 } : SPRING_SOFT}
        >
          <div ref={viewRef}>
            <AnimatePresence mode="popLayout" initial={false}>
              {inFlight ? (
                <motion.div
                  key="sending"
                  variants={viewVariants(reduced)}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <SendingPanel settling={settling} onSettled={handleSettled} />
                </motion.div>
              ) : settled ? (
                <motion.div
                  key="sent"
                  variants={viewVariants(reduced)}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <SentPanel id={status.id} onClose={() => onOpenChange(false)} />
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  variants={viewVariants(reduced)}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <FeedbackForm
                    error={status.kind === "error" ? status.message : null}
                    restored={restored}
                    diagnostics={diagnostics}
                    onStartOver={handleStartOver}
                    onSend={() => void send()}
                    onClose={() => onOpenChange(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
