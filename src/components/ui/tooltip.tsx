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
  solid?: boolean;
};

function TooltipBody({ content, side, align, solid }: TooltipBodyProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          "text-popover-foreground z-[100] rounded-md px-2.5 py-1.5 text-2xs font-medium",
          solid
            ? "bg-popover border-border max-w-[14rem] border"
            : "glass tracking-wide whitespace-nowrap uppercase",
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
  solid?: boolean;
};

const SHOW_DELAY = 200;
const HOVER_RECHECK_DELAY = 500;

function StickyTooltip({ content, children, side, align }: Omit<TooltipProps, "disabled" | "sticky">) {
  const [open, setOpen] = useState(false);
  const showTimer = useRef<number | null>(null);
  const recheckTimer = useRef<number | null>(null);

  const clearTimers = () => {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (recheckTimer.current) window.clearTimeout(recheckTimer.current);
    showTimer.current = null;
    recheckTimer.current = null;
  };

  useEffect(() => clearTimers, []);

  const show = () => {
    clearTimers();
    showTimer.current = window.setTimeout(() => setOpen(true), SHOW_DELAY);
  };

  const hide = (event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    clearTimers();
    const node = event.currentTarget;
    setOpen(false);
    recheckTimer.current = window.setTimeout(() => {
      if (node.isConnected && node.matches(":hover")) setOpen(true);
      recheckTimer.current = null;
    }, HOVER_RECHECK_DELAY);
  };

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={() => {}} delayDuration={0}>
      <TooltipPrimitive.Trigger
        asChild
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipBody content={content} side={side} align={align} />
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
  solid = false,
}: TooltipProps) {
  if (disabled || !content) return <>{children}</>;

  if (sticky) {
    return (
      <StickyTooltip content={content} side={side} align={align}>
        {children}
      </StickyTooltip>
    );
  }

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipBody content={content} side={side} align={align} solid={solid} />
    </TooltipPrimitive.Root>
  );
}

export { Tooltip, TooltipProvider };
