import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
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
import { ClearButton } from "@/settings/tabs/shortcuts/shared";
import { LAYOUT_TRANSITION, SLIDE_TRANSITION } from "@/settings/tabs/shortcuts/transitions";

const NO_MODIFIERS: ModifierState = { mod: false, shift: false, alt: false };

function useShortcutRecorder(onCommit: (shortcut: Shortcut) => void) {
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
      commitRef.current(shortcut);
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
  return <kbd className="text-foreground font-sans text-xs font-semibold">{children}</kbd>;
}

function MiniPlus() {
  return (
    <span aria-hidden className="text-muted-foreground text-sm px-0.5 font-semibold">
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
            "text-2xs whitespace-nowrap",
            invalid ? "text-destructive" : "text-muted-foreground",
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
              transition={SLIDE_TRANSITION}
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
  onChange: (shortcut: Shortcut) => void;
  onClear: () => void;
  label: string;
}) {
  const reduced = useReducedMotion();
  const { recording, held, invalid, start, stop } = useShortcutRecorder(onChange);

  return (
    <motion.span
      layout
      transition={LAYOUT_TRANSITION}
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
          "flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
            transition={LAYOUT_TRANSITION}
          >
            {shortcutKeyParts(value).map((part, index) => (
              <Fragment key={index}>
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
  onAdd: (shortcut: Shortcut) => void;
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
        transition={reduced ? { duration: 0 } : LAYOUT_TRANSITION}
        aria-label={`Recording new ${label} shortcut`}
        className="rounded-md outline-none"
      >
        <RecorderBody held={held} invalid={invalid} reduced={reduced} />
      </motion.button>
    );
  }

  return (
    <Tooltip content="Add Shortcut" solid>
      <motion.button
        type="button"
        onClick={start}
        layoutId={reduced ? undefined : layoutId}
        transition={reduced ? { duration: 0 } : LAYOUT_TRANSITION}
        aria-label={`Add ${label} shortcut`}
        className="
          text-muted-foreground
          hover:bg-accent hover:text-foreground
          focus-visible:ring-ring
          flex size-8 items-center justify-center rounded-md outline-none transition-colors
          focus-visible:ring-2
        "
      >
        <Plus className="size-4" aria-hidden />
      </motion.button>
    </Tooltip>
  );
}
