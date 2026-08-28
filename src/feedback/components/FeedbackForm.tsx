import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { DialogCloseButton, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import { SPRING_POP } from "@/lib/motion";
import { formatShortcut } from "@/lib/shortcuts";
import { CategoryChips } from "@/feedback/components/CategoryChips";
import { DiagnosticsPanel } from "@/feedback/components/DiagnosticsPanel";
import {
  cooldownRemainingMs,
  isDuplicateSend,
  useFeedbackStore,
} from "@/feedback/useFeedbackStore";
import {
  MESSAGE_MAX,
  MESSAGE_MIN,
  type Diagnostics,
  type FeedbackCategory,
} from "@/feedback/types";

const CATEGORY_PLACEHOLDER: Record<FeedbackCategory, string> = {
  bug: "What happened, and what did you expect instead?",
  idea: "What would you like Lux to do?",
  other: "What's on your mind?",
};

const SEND_SHORTCUT = formatShortcut({ mod: true, shift: false, alt: false, key: "enter" });

type Props = {
  error: string | null;
  restored: boolean;
  diagnostics: Diagnostics;
  onStartOver: () => void;
  onSend: () => void;
  onClose: () => void;
};

export function FeedbackForm({
  error,
  restored,
  diagnostics,
  onStartOver,
  onSend,
  onClose,
}: Props) {
  const reduced = useReducedMotion() ?? false;
  const draft = useFeedbackStore((s) => s.draft);
  const setDraft = useFeedbackStore((s) => s.setDraft);
  const lastSentAt = useFeedbackStore((s) => s.lastSentAt);
  const lastSentHash = useFeedbackStore((s) => s.lastSentHash);

  const [now, setNow] = useState(() => Date.now());
  const hintId = useId();
  const countId = useId();
  const categoryLabelId = useId();

  const message = draft.message.trim();
  const tooShort = message.length < MESSAGE_MIN;
  const tooLong = draft.message.length > MESSAGE_MAX;

  const waitMs = cooldownRemainingMs(lastSentAt, now);
  const cooling = waitMs > 0;
  const duplicate = isDuplicateSend({ lastSentAt, lastSentHash }, message, now);

  useEffect(() => {
    if (!cooling && !duplicate) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [cooling, duplicate]);

  const canSend = !tooShort && !tooLong && !cooling && !duplicate;

  const hint = tooLong
    ? "That’s a little long — trim it down a touch."
    : tooShort && draft.message.length > 0
      ? "A sentence or two is plenty — just enough to go on."
      : "";

  const describedBy = [hint ? hintId : null, countId].filter(Boolean).join(" ");

  return (
    <div className="scroll-fade scrollbar-inset flex max-h-[85dvh] flex-col gap-7 overflow-y-auto p-8">
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
            border-border/60 bg-foreground/5 -my-2 flex items-center gap-2 rounded-lg border
            border-dashed px-3 py-2
          "
        >
          <RotateCcw className="text-ink-4 size-3.5 shrink-0" aria-hidden />
          <span className="text-ink-3 min-w-0 flex-1 text-caption">
            Picked up where you left off.
          </span>
          <Button size="xs" variant="ghost" onClick={onStartOver}>
            Start over
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span id={categoryLabelId} className={cn(TYPE.eyebrow, "self-start")}>
          Context
        </span>
        <CategoryChips
          value={draft.category}
          onValueChange={(category) => setDraft({ category })}
          labelId={categoryLabelId}
        />
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="feedback-message" className={cn(TYPE.eyebrow, "self-start")}>
          Details
        </label>
        <div className="relative">
          <Textarea
            id="feedback-message"
            autoFocus
            rows={5}
            value={draft.message}
            aria-describedby={describedBy}
            onChange={(event) => setDraft({ message: event.target.value })}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSend) {
                event.preventDefault();
                onSend();
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
      </div>

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

      {error && (
        <p role="alert" className="text-destructive -mt-4 text-caption">
          {error}
        </p>
      )}

      <footer className="flex items-center justify-end gap-3">
        <span aria-hidden className="text-ink-4 mr-auto hidden text-caption sm:block">
          {SEND_SHORTCUT}
        </span>
        <Button size="lg" variant="ghost" className="rounded-full px-5" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="lg"
          type="button"
          onClick={onSend}
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
    </div>
  );
}
