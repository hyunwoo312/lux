import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  `
    focus-ring press inline-flex shrink-0 cursor-pointer items-center justify-center gap-2
    rounded-md font-medium whitespace-nowrap
    disabled:pointer-events-none disabled:opacity-50
    [&_svg]:shrink-0
  `,
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground hover:bg-primary/90`,
        secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80`,
        outline: `border border-input hover:bg-accent hover:text-accent-foreground`,
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: `bg-destructive text-destructive-foreground hover:bg-destructive/90`,
        "ghost-destructive": `text-destructive hover:bg-destructive/10 hover:text-destructive`,
      },
      size: {
        xs: "h-7 rounded-sm px-2 text-caption [&_svg]:size-3.5",
        sm: "h-8 px-3 text-body [&_svg]:size-4",
        lg: "h-9 px-4 text-body [&_svg]:size-4",
        "icon-xs": "size-7 rounded-sm [&_svg]:size-4",
        icon: "size-8 [&_svg]:size-4",
        "icon-lg": "size-10 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
