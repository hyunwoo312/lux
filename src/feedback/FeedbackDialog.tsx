import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { fade, springSoft } from "@/lib/motion";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useIntegrationStore } from "@/integrations";
import { buildDiagnostics } from "@/feedback/lib/diagnostics";
import { submitFeedback } from "@/feedback/lib/submit";
import { FeedbackForm } from "@/feedback/components/FeedbackForm";
import { SentPanel } from "@/feedback/components/SentPanel";
import { SendingPanel } from "@/feedback/components/SendingPanel";
import { useElementSize } from "@/hooks/useElementSize";
import { messageHash, useFeedbackStore } from "@/feedback/useFeedbackStore";

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

export function FeedbackDialog() {
  const open = useFeedbackStore((s) => s.open);
  const setOpen = useFeedbackStore((s) => s.setOpen);
  const reduced = useReducedMotion() ?? false;
  const clearDraft = useFeedbackStore((s) => s.clearDraft);
  const recordSent = useFeedbackStore((s) => s.recordSent);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [restored, setRestored] = useState(false);
  const diagnostics = useDiagnostics();
  const [viewRef, { height: viewHeight }] = useElementSize<HTMLDivElement>();

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
        setOpen(next);
      }}
    >
      <DialogContent layout="flush" showClose={false} dismissOnClickOutside={!inFlight} width="md">
        <motion.div
          className="relative overflow-hidden"
          initial={false}
          animate={{ height: viewHeight || "auto" }}
          transition={springSoft(reduced)}
        >
          <div ref={viewRef}>
            <AnimatePresence mode="popLayout" initial={false}>
              {inFlight ? (
                <motion.div key="sending" {...fade(reduced)}>
                  <SendingPanel settling={settling} onSettled={handleSettled} />
                </motion.div>
              ) : settled ? (
                <motion.div key="sent" {...fade(reduced)}>
                  <SentPanel id={status.id} onClose={() => setOpen(false)} />
                </motion.div>
              ) : (
                <motion.div key="form" {...fade(reduced)}>
                  <FeedbackForm
                    error={status.kind === "error" ? status.message : null}
                    restored={restored}
                    diagnostics={diagnostics}
                    onStartOver={handleStartOver}
                    onSend={() => void send()}
                    onClose={() => setOpen(false)}
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
