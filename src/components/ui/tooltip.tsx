import type { ComponentProps, FocusEvent, PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration = 200,
  skipDelayDuration = 300,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

type Side = ComponentProps<typeof TooltipPrimitive.Content>["side"];
type Align = ComponentProps<typeof TooltipPrimitive.Content>["align"];

type TooltipBodyProps = {
  content: ReactNode;
  side?: Side;
  align?: Align;
  prose?: boolean;
};

function TooltipBody({ content, side, align, prose }: TooltipBodyProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          `
            bg-popover text-popover-foreground overlay-pop elev-3 z-tooltip rounded-md px-2.5 py-1.5
            text-micro font-medium
          `,
          prose ? "max-w-[14rem]" : "tracking-wide whitespace-nowrap uppercase",
        )}
      >
        {content}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  sticky?: boolean;
  side?: Side;
  align?: Align;
  prose?: boolean;
};

const SHOW_DELAY = 200;

function StickyTooltip({
  content,
  children,
  side,
  align,
  prose,
}: Omit<TooltipProps, "disabled" | "sticky">) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  const stopTimer = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => stopTimer, []);

  const show = () => {
    stopTimer();
    timer.current = window.setTimeout(() => setOpen(true), SHOW_DELAY);
  };

  const hide = (event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    stopTimer();
    if (event.currentTarget.matches(":hover")) return;
    setOpen(false);
  };

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={() => {}} delayDuration={0}>
      <TooltipPrimitive.Trigger
        asChild
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            stopTimer();
            setOpen(false);
          }
        }}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipBody content={content} side={side} align={align} prose={prose} />
    </TooltipPrimitive.Root>
  );
}

function Tooltip({
  content,
  children,
  disabled = false,
  sticky = false,
  side = "bottom",
  align = "center",
  prose = false,
}: TooltipProps) {
  if (disabled || !content) return <>{children}</>;

  if (sticky) {
    return (
      <StickyTooltip content={content} side={side} align={align} prose={prose}>
        {children}
      </StickyTooltip>
    );
  }

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipBody content={content} side={side} align={align} prose={prose} />
    </TooltipPrimitive.Root>
  );
}

export { Tooltip, TooltipProvider };
