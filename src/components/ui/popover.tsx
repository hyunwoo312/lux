import type { ComponentProps } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor(props: ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

const popoverContentVariants = cva(
  `
    bg-popover text-popover-foreground border-border overlay-pop z-popover rounded-xl border elev-3
    outline-none origin-[var(--radix-popover-content-transform-origin)]
  `,
  {
    variants: {
      padding: {
        menu: "p-1",
        panel: "p-3",
        none: "p-0",
      },
    },
    defaultVariants: {
      padding: "menu",
    },
  },
);

type PopoverContentProps = ComponentProps<typeof PopoverPrimitive.Content> &
  VariantProps<typeof popoverContentVariants>;

function PopoverContent({
  className,
  align = "center",
  sideOffset = 6,
  padding,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(popoverContentVariants({ padding, className }))}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
