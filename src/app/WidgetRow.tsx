import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { forwardRef } from "react";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import { SPRING_CRISP } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { accentClass } from "@/widgets/core/accent";
import type { WidgetPlugin } from "@/widgets/core/types";

type WidgetCardProps = {
  plugin: WidgetPlugin;
  added: number;
  needsAccount: boolean;
  previewed: boolean;
  variants: Variants;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPreview: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  onSelect: () => void;
};

export const WidgetRow = forwardRef<HTMLButtonElement, WidgetCardProps>(function WidgetRow(
  {
    plugin,
    added,
    needsAccount,
    previewed,
    variants,
    onPointerDown,
    onPreview,
    onKeyDown,
    onSelect,
  },
  ref,
) {
  const Icon = plugin.icon;
  return (
    <motion.button
      ref={ref}
      variants={variants}
      type="button"
      onPointerDown={onPointerDown}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      onKeyDown={onKeyDown}
      onClick={onSelect}
      className="
        press focus-ring relative flex cursor-grab touch-none items-start gap-2.5 rounded-md px-2
        py-2 text-left
      "
    >
      {previewed && (
        <motion.span
          layoutId="palette-hover"
          aria-hidden
          transition={SPRING_CRISP}
          className="bg-accent pointer-events-none absolute inset-0 rounded-md"
        />
      )}
      <span
        className={cn(
          `
            relative mt-0.5 flex size-7 shrink-0 items-center justify-center
            [&_img]:size-5
            [&_svg]:size-5
          `,
          accentClass(plugin.tint),
          !plugin.brandIcon && "text-primary",
        )}
      >
        <Icon />
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-body font-medium">{plugin.name}</span>
          {added > 0 && (
            <span
              className="
                bg-foreground/10 text-ink-3 shrink-0 rounded-sm px-1 text-micro font-semibold
                tabular-nums
              "
              aria-hidden
            >
              {added}
            </span>
          )}
          {added > 0 && (
            <span className="sr-only">
              {added === 1 ? "1 on your dashboard" : `${added} on your dashboard`}, adds another
            </span>
          )}
        </span>
        <span className="text-ink-4 text-micro line-clamp-2 leading-snug">
          {plugin.description}
        </span>
        {needsAccount ? (
          <span className="text-ink-4 text-micro font-semibold tracking-wide uppercase">
            Needs an account
          </span>
        ) : (
          plugin.recommended &&
          added === 0 && (
            <span className="text-primary text-micro font-semibold tracking-wide uppercase">
              Recommended
            </span>
          )
        )}
      </span>
    </motion.button>
  );
});
