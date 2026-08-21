import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Copy, Loader2, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";
import { CWS_REVIEW_URL } from "@/lib/links";
import { openUrl } from "@/lib/open-url";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useIntegrationStore } from "@/integrations";
import { buildDiagnostics, describeDiagnostics } from "@/feedback/lib/diagnostics";
import { submitFeedback } from "@/feedback/lib/submit";
import {
  cooldownRemainingMs,
  isDuplicateSend,
  messageHash,
  useFeedbackStore,
} from "@/feedback/useFeedbackStore";
import {
  FEEDBACK_CATEGORIES,
  MESSAGE_MAX,
  MESSAGE_MIN,
  CONTACT_MAX,
  type FeedbackCategory,
} from "@/feedback/types";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; id: string }
  | { kind: "error"; message: string; retryable: boolean };

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: "Something's broken",
  idea: "I have an idea",
  other: "Something else",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const diagnosticsId = useId();
  const categoryLabelId = useId();
  const contactErrorId = useId();
  const categoryRefs = useRef<Partial<Record<FeedbackCategory, HTMLButtonElement | null>>>({});
  const diagnostics = useDiagnostics();
  const abortRef = useRef<AbortController | null>(null);
  const sendShortcut = navigator.platform.startsWith("Mac") ? "⌘ + Enter" : "Ctrl + Enter";

  useEffect(() => {
    if (open) setStatus({ kind: "idle" });
    return () => abortRef.current?.abort();
  }, [open]);

  const trimmed = draft.message.trim();
  const tooShort = trimmed.length < MESSAGE_MIN;
  const tooLong = trimmed.length > MESSAGE_MAX;
  const contact = draft.contact.trim();
  const contactInvalid = contact.length > 0 && !EMAIL_PATTERN.test(contact);
  const canSend = !tooShort && !tooLong && !contactInvalid && status.kind !== "sending";

  const send = async (): Promise<void> => {
    const now = Date.now();
    const { lastSentAt, lastSentHash } = useFeedbackStore.getState();

    const waitMs = cooldownRemainingMs(lastSentAt, now);
    if (waitMs > 0) {
      const seconds = Math.ceil(waitMs / 1000);
      setStatus({
        kind: "error",
        retryable: true,
        message: `Just a moment — you can send another in ${seconds}s.`,
      });
      return;
    }

    if (isDuplicateSend({ lastSentAt, lastSentHash }, trimmed, now)) {
      setStatus({
        kind: "error",
        retryable: false,
        message: "You already sent this one — it's on its way.",
      });
      return;
    }

    setStatus({ kind: "sending" });
    abortRef.current = new AbortController();

    const result = await submitFeedback(
      {
        category: draft.category,
        message: trimmed,
        ...(contact ? { contact } : {}),
        ...(draft.includeDiagnostics ? { diagnostics } : {}),
      },
      abortRef.current.signal,
    );

    if (result.ok) {
      recordSent(messageHash(trimmed), Date.now());
      clearDraft();
      setStatus({ kind: "sent", id: result.id });
      return;
    }
    setStatus({ kind: "error", message: result.message, retryable: result.retryable });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          glass-panel flex max-h-[85dvh] w-[min(32rem,calc(100vw-2rem))] flex-col gap-0
          overflow-hidden p-0
        "
      >
        <header className="border-border/50 flex flex-col gap-1 border-b px-6 py-5">
          <DialogTitle className="text-base font-semibold">Send feedback</DialogTitle>
          <DialogDescription className="text-ink-3 text-body">
            Bugs, ideas, or anything else — it goes straight to the developer.
          </DialogDescription>
        </header>

        {status.kind === "sent" ? (
          <SentPanel id={status.id} reduced={reduced} onClose={() => onOpenChange(false)} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-2">
              <span id={categoryLabelId} className="text-ink-3 text-caption font-medium">
                What kind of feedback?
              </span>
              <div
                role="radiogroup"
                aria-labelledby={categoryLabelId}
                className="flex flex-wrap gap-2"
              >
                {FEEDBACK_CATEGORIES.map((category, index) => {
                  const active = draft.category === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setDraft({ category })}
                      onKeyDown={(event) => {
                        const step =
                          event.key === "ArrowRight" || event.key === "ArrowDown"
                            ? 1
                            : event.key === "ArrowLeft" || event.key === "ArrowUp"
                              ? -1
                              : 0;
                        if (step === 0) return;
                        event.preventDefault();
                        const count = FEEDBACK_CATEGORIES.length;
                        const next = FEEDBACK_CATEGORIES[(index + step + count) % count];
                        if (next) {
                          setDraft({ category: next });
                          categoryRefs.current[next]?.focus();
                        }
                      }}
                      ref={(node) => {
                        categoryRefs.current[category] = node;
                      }}
                      className={cn(
                        `
                          focus-visible:ring-ring
                          rounded-full border px-3 py-1.5 text-caption font-medium outline-none
                          transition-colors
                          focus-visible:ring-2
                        `,
                        active
                          ? "border-primary/40 bg-primary/10 text-ink"
                          : "border-border text-ink-3 hover:bg-accent/60",
                      )}
                    >
                      {CATEGORY_LABEL[category]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="feedback-message" className="text-caption font-medium">
                Your message
              </label>
              <textarea
                id="feedback-message"
                autoFocus
                rows={6}
                value={draft.message}
                onChange={(event) => setDraft({ message: event.target.value })}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSend) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder={CATEGORY_PLACEHOLDER[draft.category]}
                className="
                  border-border bg-background/40
                  placeholder:text-ink-4
                  focus-visible:border-primary/50
                  w-full resize-none rounded-md border px-3 py-2 text-body outline-none
                  transition-colors
                "
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-4 min-w-0 text-caption">
                  {tooLong
                    ? "That's a little long — trim it down a touch."
                    : tooShort
                      ? "A sentence or two is plenty — just enough to go on."
                      : ""}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "shrink-0 text-caption tabular-nums",
                    tooLong ? "text-destructive" : "text-ink-4",
                  )}
                >
                  {trimmed.length} / {MESSAGE_MAX}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="feedback-contact" className="text-caption font-medium">
                Email <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <input
                id="feedback-contact"
                type="email"
                maxLength={CONTACT_MAX}
                value={draft.contact}
                onChange={(event) => setDraft({ contact: event.target.value })}
                placeholder="Only if you'd like a reply"
                aria-invalid={contactInvalid}
                aria-describedby={contactInvalid ? contactErrorId : undefined}
                className={cn(
                  `
                    bg-background/40
                    placeholder:text-ink-4
                    w-full rounded-md border px-3 py-2 text-body outline-none transition-colors
                  `,
                  contactInvalid
                    ? "border-destructive/60"
                    : "border-border focus-visible:border-primary/50",
                )}
              />
              {contactInvalid && (
                <p id={contactErrorId} className="text-destructive text-caption">
                  That doesn't look like an email address — check it, or leave it empty.
                </p>
              )}
            </div>

            <div
              className={cn(
                "flex flex-col gap-2 rounded-md border p-3 transition-colors",
                draft.includeDiagnostics ? "border-primary/30 bg-primary/5" : "border-border/50",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <label htmlFor="feedback-diagnostics" className="text-caption font-medium">
                    Include diagnostics
                  </label>
                  <p className="text-ink-4 text-caption">
                    Your Lux version, browser, and which widgets and accounts you use — never their
                    contents.
                  </p>
                </div>
                <Switch
                  id="feedback-diagnostics"
                  checked={draft.includeDiagnostics}
                  onCheckedChange={(includeDiagnostics) => setDraft({ includeDiagnostics })}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowDiagnostics((value) => !value)}
                aria-expanded={showDiagnostics}
                aria-controls={diagnosticsId}
                className="
                  text-ink-3
                  hover:text-ink
                  flex items-center gap-1 self-start text-caption transition-colors
                "
              >
                {showDiagnostics ? "Hide" : "View"} what would be sent
                <motion.span
                  className="flex"
                  animate={{ rotate: showDiagnostics ? 180 : 0 }}
                  transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
                >
                  <ChevronDown className="size-3" aria-hidden />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {showDiagnostics && (
                  <motion.div
                    id={diagnosticsId}
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT }}
                  >
                    <pre
                      className="
                        bg-background/50 text-ink-3 max-h-40 overflow-auto rounded p-2 text-micro
                      "
                    >
                      {describeDiagnostics(diagnostics)}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {status.kind === "error" && (
              <p role="alert" className="text-destructive text-caption">
                {status.message}
              </p>
            )}
          </div>
        )}

        {status.kind !== "sent" && (
          <footer className="border-border/50 flex items-center gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={() => openUrl(CWS_REVIEW_URL, "newTab")}
              className="
                text-ink-3
                hover:text-ink
                flex items-center gap-1.5 text-caption transition-colors
              "
            >
              <Star className="size-3.5" aria-hidden />
              Rate Lux
            </button>
            <span aria-hidden className="text-ink-4 ml-auto hidden text-caption sm:block">
              {sendShortcut}
            </span>
            <Button
              type="button"
              onClick={() => void send()}
              disabled={!canSend}
              className="min-w-24"
            >
              {status.kind === "sending" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Send"
              )}
            </Button>
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SentPanel({
  id,
  reduced,
  onClose,
}: {
  id: string;
  reduced: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT }}
        className="flex flex-col items-center gap-3 px-6 py-10 text-center"
      >
        <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-full">
          <Check className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-body font-medium">Thank you — that's been sent.</p>
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy reference ${id}`}
            className="
              text-ink-3
              hover:text-ink
              flex items-center gap-1.5 text-caption transition-colors
            "
          >
            Reference <span className="font-mono">{id}</span>
            {copied ? (
              <Check className="text-primary size-3" aria-hidden />
            ) : (
              <Copy className="size-3" aria-hidden />
            )}
          </button>
        </div>
        <p className="text-ink-4 max-w-xs text-caption">
          Every message is read. If you left an email, expect a reply when there's something worth
          saying.
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openUrl(CWS_REVIEW_URL, "newTab")}>
            <Star className="size-3.5" aria-hidden />
            Rate Lux
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
