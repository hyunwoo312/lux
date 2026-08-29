import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE_MORPH, enterTween, stagger } from "@/lib/motion";
import { useElementSize } from "@/hooks/useElementSize";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

const COLLAPSED_W = 28;

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
  className?: string;
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
  className,
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
      const target = event.target as Element | null;
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        !target?.closest("[data-radix-popper-content-wrapper]")
      ) {
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

  const handleClose = () => {
    if (value.length > 0) {
      onValueChange("");
      inputRef.current?.focus();
    } else {
      onOpenChange(false);
    }
  };

  const morph = enterTween(reduced, "slow", EASE_MORPH);
  const surface = enterTween(reduced, "base", EASE_MORPH);
  const contentIn = (stage: number) => ({
    ...surface,
    delay: open ? stage * stagger(reduced, "loose") : 0,
  });

  return (
    <Popover open={Boolean(popupOpen)}>
      <PopoverAnchor asChild>
        <div ref={setRoot} className={cn("relative h-7", className)}>
          <motion.div
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            initial={false}
            animate={{ width: open ? width || COLLAPSED_W : COLLAPSED_W }}
            transition={morph}
            className={cn(
              "absolute top-0 left-0 flex h-7 items-center overflow-hidden rounded-sm",
              !reduced && "transition-shadow duration-base",
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
              className="
                border-input bg-popover pointer-events-none absolute inset-0 rounded-sm border
              "
            />
            <button
              type="button"
              aria-label={ariaLabel}
              aria-expanded={open}
              tabIndex={open ? -1 : 0}
              onClick={() => onOpenChange(true)}
              className={cn(
                "press focus-ring cursor-pointer",
                `
                  relative grid size-7 shrink-0 place-items-center rounded-sm transition-colors
                  duration-base
                  [&_svg]:size-4
                `,
                open ? "text-primary" : hovered ? "text-ink" : "text-ink-3",
              )}
            >
              <Search aria-hidden />
            </button>
            <motion.input
              ref={inputRef}
              initial={false}
              animate={{ opacity: open ? 1 : 0 }}
              transition={contentIn(2)}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={onInputKeyDown}
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
                "placeholder:text-ink-3 text-ink",
                "relative h-full min-w-0 flex-1 bg-transparent text-body outline-none",
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
              transition={contentIn(3)}
              className={cn(
                "press cursor-pointer",
                `
                  text-ink-3
                  hover:text-ink hover:bg-foreground/5
                  relative mr-1 grid size-6 shrink-0 place-items-center rounded-sm
                  [&_svg]:size-3.5
                `,
                !open && "pointer-events-none",
              )}
            >
              <X aria-hidden />
            </motion.button>
          </motion.div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)]"
      >
        <div className="max-h-72 overflow-y-auto rounded-lg">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
