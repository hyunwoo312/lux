import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, X } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatShortcut,
  isValidShortcut,
  modifierLabels,
  shortcutFromEvent,
  shortcutKeyParts,
  type ModifierState,
  type Shortcut,
} from "@/lib/shortcuts";
import { DURATION, EASE_OUT_STRONG, SPRING_CRISP } from "@/lib/motion";

const NO_MODIFIERS: ModifierState = { mod: false, shift: false, alt: false };

function useShortcutRecorder(onCommit: (shortcut: Shortcut) => boolean) {
  const [recording, setRecording] = useState(false);
  const [held, setHeld] = useState<ModifierState>(NO_MODIFIERS);
  const [invalid, setInvalid] = useState(false);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => {
    if (!recording) return;
    const sync = (event: KeyboardEvent) =>
      setHeld({
        mod: event.ctrlKey || event.metaKey,
        shift: event.shiftKey,
        alt: event.altKey,
      });
    function onKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setRecording(false);
        return;
      }
      sync(event);
      const shortcut = shortcutFromEvent(event);
      if (!shortcut) {
        setInvalid(false);
        return;
      }
      if (!isValidShortcut(shortcut)) {
        setInvalid(true);
        return;
      }
      if (!commitRef.current(shortcut)) {
        setInvalid(true);
        return;
      }
      setRecording(false);
    }
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", sync, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", sync, true);
    };
  }, [recording]);

  const start = () => {
    setHeld(NO_MODIFIERS);
    setInvalid(false);
    setRecording(true);
  };
  const stop = () => setRecording(false);

  return { recording, held, invalid, start, stop };
}

function KeyText({ children }: { children: ReactNode }) {
  return <kbd className="text-ink font-sans text-caption font-semibold">{children}</kbd>;
}

function MiniPlus() {
  return (
    <span aria-hidden className="text-ink-3 text-body px-0.5 font-semibold">
      +
    </span>
  );
}

function RecorderBody({
  held,
  invalid,
  reduced,
}: {
  held: ModifierState;
  invalid: boolean;
  reduced: boolean | null;
}) {
  const heldParts = modifierLabels(held);
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-sm border py-1.5 pr-1.5 pl-2",
        invalid ? "border-destructive" : "border-primary",
      )}
    >
      {heldParts.length === 0 ? (
        <span
          className={cn(
            "text-micro whitespace-nowrap",
            invalid ? "text-destructive" : "text-ink-3",
          )}
        >
          press any keys
        </span>
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          {heldParts.map((part) => (
            <motion.span
              key={part}
              layout
              className="flex items-center gap-1"
              initial={reduced ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -6 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT_STRONG }}
            >
              <KeyText>{part}</KeyText>
              <MiniPlus />
            </motion.span>
          ))}
        </AnimatePresence>
      )}
    </span>
  );
}

export function ShortcutDisplay({
  value,
  onChange,
  onClear,
  label,
}: {
  value: Shortcut;
  onChange: (shortcut: Shortcut) => boolean;
  onClear: () => void;
  label: string;
}) {
  const reduced = useReducedMotion();
  const { recording, held, invalid, start, stop } = useShortcutRecorder(onChange);

  return (
    <motion.span
      layout
      transition={SPRING_CRISP}
      className={cn(
        "group inline-flex items-center rounded-sm transition-colors",
        !recording &&
          "hover:border-primary hover:bg-accent border border-transparent py-1.5 pr-1.5 pl-2",
      )}
    >
      <button
        type="button"
        onClick={start}
        onBlur={stop}
        aria-label={
          recording
            ? `Recording ${label}`
            : `${label}, currently ${formatShortcut(value)}. Click to change.`
        }
        className={cn(
          "press cursor-pointer",
          "focus-ring flex items-center rounded-md ",
          !recording && "gap-1",
        )}
      >
        {recording ? (
          <RecorderBody held={held} invalid={invalid} reduced={reduced} />
        ) : (
          <motion.span
            key={formatShortcut(value)}
            className="flex items-center gap-1"
            initial={reduced ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SPRING_CRISP}
          >
            {shortcutKeyParts(value).map((part, index) => (
              <Fragment key={part}>
                {index > 0 && <MiniPlus />}
                <KeyText>{part}</KeyText>
              </Fragment>
            ))}
          </motion.span>
        )}
      </button>
      {!recording && <ClearButton onClear={onClear} label={label} />}
    </motion.span>
  );
}

export function AddShortcutControl({
  onAdd,
  label,
}: {
  onAdd: (shortcut: Shortcut) => boolean;
  label: string;
}) {
  const reduced = useReducedMotion();
  const layoutId = useId();
  const recorderRef = useRef<HTMLButtonElement>(null);
  const { recording, held, invalid, start, stop } = useShortcutRecorder(onAdd);

  useEffect(() => {
    if (recording) recorderRef.current?.focus();
  }, [recording]);

  if (recording) {
    return (
      <motion.button
        ref={recorderRef}
        type="button"
        onBlur={stop}
        layoutId={reduced ? undefined : layoutId}
        transition={reduced ? { duration: 0 } : SPRING_CRISP}
        aria-label={`Recording new ${label} shortcut`}
        className="press cursor-pointer rounded-md outline-none"
      >
        <RecorderBody held={held} invalid={invalid} reduced={reduced} />
      </motion.button>
    );
  }

  return (
    <Tooltip content="Add Shortcut" prose>
      <motion.button
        type="button"
        onClick={start}
        layoutId={reduced ? undefined : layoutId}
        transition={reduced ? { duration: 0 } : SPRING_CRISP}
        aria-label={`Add ${label} shortcut`}
        className="
          press cursor-pointer focus-ring text-ink-3
          hover:bg-accent hover:text-ink
          flex size-8 items-center justify-center rounded-md
        "
      >
        <Plus className="size-4" aria-hidden />
      </motion.button>
    </Tooltip>
  );
}

function ClearButton({ onClear, label }: { onClear: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Clear ${label}`}
      className="
        cursor-pointer focus-ring text-ink-4
        hover:text-destructive
        ml-1 grid size-4 shrink-0 scale-90 place-items-center rounded-xs opacity-0
        transition-[opacity,transform]
        group-hover:scale-100 group-hover:opacity-100
        focus-visible:scale-100 focus-visible:opacity-100
      "
    >
      <X className="size-3.5" aria-hidden />
    </button>
  );
}
