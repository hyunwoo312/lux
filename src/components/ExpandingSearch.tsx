import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useElementSize } from "@/hooks/useElementSize";

const COLLAPSED_W = 28;
const MORPH_EASE = [0.2, 0.8, 0.2, 1] as const;

type ExpandingSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  onInputKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  listboxId?: string;
  activeDescendantId?: string;
  popupOpen?: boolean;
  children?: ReactNode;
};

export function ExpandingSearch({
  open,
  onOpenChange,
  value,
  onValueChange,
  ariaLabel,
  placeholder,
  onInputKeyDown,
  listboxId,
  activeDescendantId,
  popupOpen,
  children,
}: ExpandingSearchProps) {
  const reduced = useReducedMotion();
  const [sizeRef, { width }] = useElementSize<HTMLDivElement>();
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(open);

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      sizeRef(node);
    },
    [sizeRef],
  );

  useEffect(() => {
    if (open && !wasOpen.current) inputRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      onOpenChange(false);
      return;
    }
    onInputKeyDown?.(event);
  };

  const handleClose = () => {
    if (value.length > 0) {
      onValueChange("");
      inputRef.current?.focus();
    } else {
      onOpenChange(false);
    }
  };

  const morph = { duration: reduced ? 0 : 0.42, ease: MORPH_EASE };
  const surface = { duration: reduced ? 0 : 0.3, ease: MORPH_EASE };
  const contentIn = (delay: number) => ({
    duration: reduced ? 0 : 0.25,
    ease: MORPH_EASE,
    delay: open && !reduced ? delay : 0,
  });

  return (
    <div ref={setRoot} className="relative h-7">
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        initial={false}
        animate={{ width: open ? width || COLLAPSED_W : COLLAPSED_W }}
        transition={morph}
        className={cn(
          "absolute top-0 left-0 flex h-7 items-center overflow-hidden rounded-sm",
          !reduced && "transition-shadow duration-300",
          open ? "shadow-sm" : "shadow-none",
        )}
      >
        <motion.span
          aria-hidden
          initial={false}
          animate={{ opacity: !open && hovered ? 1 : 0 }}
          transition={surface}
          className="bg-accent pointer-events-none absolute inset-0 rounded-sm"
        />
        <motion.span
          aria-hidden
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={surface}
          className="border-input bg-popover pointer-events-none absolute inset-0 rounded-sm border"
        />
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          tabIndex={open ? -1 : 0}
          onClick={() => onOpenChange(true)}
          className={cn(
            `
              relative grid size-7 shrink-0 place-items-center rounded-sm transition-colors
              duration-300
              [&_svg]:size-4
            `,
            open ? "text-primary" : hovered ? "text-foreground" : "text-muted-foreground/60",
          )}
        >
          <Search aria-hidden />
        </button>
        <motion.input
          ref={inputRef}
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={contentIn(0.12)}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={Boolean(popupOpen)}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendantId}
          aria-autocomplete="list"
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          className={cn(
            "placeholder:text-muted-foreground/60 text-foreground",
            "relative h-full min-w-0 flex-1 bg-transparent text-sm outline-none",
            !open && "pointer-events-none",
          )}
        />
        <motion.button
          type="button"
          aria-label="Close search"
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          onClick={handleClose}
          initial={false}
          animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.6 }}
          transition={contentIn(0.16)}
          className={cn(
            `
              text-muted-foreground/60
              hover:text-foreground hover:bg-foreground/5
              relative mr-1 grid size-6 shrink-0 place-items-center rounded-sm
              [&_svg]:size-3.5
            `,
            !open && "pointer-events-none",
          )}
        >
          <X aria-hidden />
        </motion.button>
      </motion.div>
      {children}
    </div>
  );
}
