import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  `
    border-input bg-background/60
    placeholder:text-ink-3
    hover:border-foreground/25
    focus-ring flex w-full min-w-0 rounded-md border transition-colors
    disabled:cursor-not-allowed disabled:opacity-50
  `,
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 py-1 text-body",
        lg: "h-9 px-3 py-1 text-body",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  },
);

type InputProps = Omit<ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>;

function Input({ className, type, size, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  );
}

export { Input };
