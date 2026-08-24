import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DURATION, EASE_IN, EASE_OUT, SPRING_POP, SPRING_SOFT } from "@/lib/motion";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useIntegrationStore } from "@/integrations";
import { buildDiagnostics, parseOs } from "@/feedback/lib/diagnostics";
import { submitFeedback } from "@/feedback/lib/submit";
import { Field } from "@/feedback/components/Field";
import { CategoryChips } from "@/feedback/components/CategoryChips";
import { DiagnosticsPanel } from "@/feedback/components/DiagnosticsPanel";
import { SentPanel } from "@/feedback/components/SentPanel";
import { SendingPanel } from "@/feedback/components/SendingPanel";
import { useMeasuredHeight } from "@/feedback/lib/useMeasuredHeight";
import {
  cooldownRemainingMs,
  isDuplicateSend,
  messageHash,
  useFeedbackStore,
} from "@/feedback/useFeedbackStore";
import { MESSAGE_MAX, MESSAGE_MIN, type FeedbackCategory } from "@/feedback/types";

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

const CATEGORY_PLACEHOLDER: Record<FeedbackCategory, string> = {
  bug: "What happened, and what did you expect instead?",
  idea: "What would you like Lux to do?",
  other: "What's on your mind?",
};

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
  const draft = useFeedbackStore((s) => s.draft);
  const setDraft = useFeedbackStore((s) => s.setDraft);
  const clearDraft = useFeedbackStore((s) => s.clearDraft);
  const recordSent = useFeedbackStore((s) => s.recordSent);
  const lastSentAt = useFeedbackStore((s) => s.lastSentAt);
  const lastSentHash = useFeedbackStore((s) => s.lastSentHash);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [restored, setRestored] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const hintId = useId();
  const countId = useId();
  const categoryLabelId = useId();
  const diagnostics = useDiagnostics();
  const abortRef = useRef<AbortController | null>(null);
  const [viewRef, viewHeight] = useMeasuredHeight<HTMLDivElement>();
  const sendShortcut = parseOs(navigator.userAgent) === "macOS" ? "⌘ + Enter" : "Ctrl + Enter";

  useEffect(() => {
    if (!open) return;
    setStatus({ kind: "idle" });
    setNow(Date.now());
    setRestored(useFeedbackStore.getState().draft.message.trim().length > 0);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const message = draft.message.trim();
  const tooShort = message.length < MESSAGE_MIN;
  const tooLong = draft.message.length > MESSAGE_MAX;

  const waitMs = cooldownRemainingMs(lastSentAt, now);
  const cooling = waitMs > 0;
  const duplicate = isDuplicateSend({ lastSentAt, lastSentHash }, message, now);
  const sending = status.kind === "sending";
  const settling = status.kind === "settling";
  const inFlight = sending || settling;
  const settled = status.kind === "sent";

  useEffect(() => {
    if (!open || !cooling) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [open, cooling]);

  const canSend = !tooShort && !tooLong && !cooling && !duplicate && !inFlight;

  const send = async (): Promise<void> => {
    setStatus({ kind: "sending" });
    abortRef.current = new AbortController();

    const result = await submitFeedback(
      {
        category: draft.category,
        message,
        ...(draft.includeDiagnostics ? { diagnostics } : {}),
      },
      abortRef.current.signal,
    );

    if (result.ok) {
      recordSent(messageHash(message), Date.now());
      clearDraft();
      setRestored(false);
      setStatus({ kind: "settling", id: result.id });
      return;
    }
    setStatus({ kind: "error", message: result.message, retryable: result.retryable });
  };

  const hint = tooLong
    ? "That’s a little long — trim it down a touch."
    : tooShort && draft.message.length > 0
      ? "A sentence or two is plenty — just enough to go on."
      : "";

  const describedBy = [hint ? hintId : null, countId].filter(Boolean).join(" ");

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
                  <SendingPanel
                    settling={settling}
                    onSettled={() => {
                      if (status.kind === "settling") setStatus({ kind: "sent", id: status.id });
                    }}
                  />
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
                  className="
                    scroll-fade scrollbar-inset flex max-h-[85dvh] flex-col gap-7 overflow-y-auto
                    p-8
                  "
                >
                  <header className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <DialogTitle>Send feedback</DialogTitle>
                      <DialogDescription className="text-ink-3 text-body">
                        Describe the issue or share your ideas to help improve Lux.
                      </DialogDescription>
                    </div>
                    <DialogCloseButton className="-mt-1 -mr-2 shrink-0" />
                  </header>

                  {restored && message.length > 0 && (
                    <div
                      className="
                        border-border/60 bg-foreground/5 -my-2 flex items-center gap-2 rounded-lg
                        border border-dashed px-3 py-2
                      "
                    >
                      <RotateCcw className="text-ink-4 size-3.5 shrink-0" aria-hidden />
                      <span className="text-ink-3 min-w-0 flex-1 text-caption">
                        Picked up where you left off.
                      </span>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          clearDraft();
                          setRestored(false);
                        }}
                      >
                        Start over
                      </Button>
                    </div>
                  )}

                  <Field label="Context" labelId={categoryLabelId}>
                    <CategoryChips
                      value={draft.category}
                      onValueChange={(category) => setDraft({ category })}
                      labelId={categoryLabelId}
                    />
                  </Field>

                  <Field label="Details" htmlFor="feedback-message">
                    <div className="relative">
                      <Textarea
                        id="feedback-message"
                        autoFocus
                        rows={5}
                        value={draft.message}
                        aria-describedby={describedBy}
                        onChange={(event) => setDraft({ message: event.target.value })}
                        onKeyDown={(event) => {
                          if (
                            (event.metaKey || event.ctrlKey) &&
                            event.key === "Enter" &&
                            canSend
                          ) {
                            event.preventDefault();
                            void send();
                          }
                        }}
                        placeholder={CATEGORY_PLACEHOLDER[draft.category]}
                        className="block min-h-30 resize-y rounded-xl p-4 pb-8"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute right-4 bottom-3 text-micro tabular-nums",
                          tooLong ? "text-destructive" : "text-ink-4",
                        )}
                      >
                        {draft.message.length} / {MESSAGE_MAX}
                      </span>
                    </div>
                    {hint && (
                      <span id={hintId} className="text-ink-4 text-caption">
                        {hint}
                      </span>
                    )}
                    <span id={countId} className="sr-only">
                      {draft.message.length} of {MESSAGE_MAX} characters used.
                    </span>
                  </Field>

                  <DiagnosticsPanel
                    enabled={draft.includeDiagnostics}
                    onEnabledChange={(includeDiagnostics) => setDraft({ includeDiagnostics })}
                    diagnostics={diagnostics}
                  />

                  {duplicate && (
                    <p className="text-ink-3 -mt-4 text-caption">
                      You already sent this one — it’s on its way.
                    </p>
                  )}

                  {status.kind === "error" && (
                    <p role="alert" className="text-destructive -mt-4 text-caption">
                      {status.message}
                    </p>
                  )}

                  <footer className="flex items-center justify-end gap-3">
                    <span aria-hidden className="text-ink-4 mr-auto hidden text-caption sm:block">
                      {sendShortcut}
                    </span>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="rounded-full px-5"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="lg"
                      type="button"
                      onClick={() => void send()}
                      disabled={!canSend}
                      className="min-w-36 rounded-full px-6"
                    >
                      <motion.span
                        key={cooling ? "waiting" : "idle"}
                        initial={reduced ? false : { opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={reduced ? { duration: 0 } : SPRING_POP}
                      >
                        {cooling ? `Wait ${Math.ceil(waitMs / 1000)}s` : "Send Feedback"}
                      </motion.span>
                    </Button>
                  </footer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
