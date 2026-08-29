import type { ComponentProps } from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toggleGroupItemVariants = cva(
  `focus-ring press cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`,
  {
    variants: {
      variant: {
        segmented: `
          text-ink-3
          hover:text-ink
          data-[state=on]:text-primary-foreground
          relative rounded-sm px-2.5 py-1 text-caption font-medium
        `,
        chip: `
          border-border text-ink-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1
          text-caption font-medium
          hover:bg-accent/60 hover:text-ink
          disabled:opacity-40
          data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-ink
          [&_img]:size-4
          [&_svg]:size-4
          data-[state=on]:[&_svg]:text-primary
        `,
        card: `
          border-border text-ink-3 flex flex-col items-center justify-center gap-2 rounded-lg border
          px-2 py-3 text-caption font-medium
          hover:bg-accent/50
          data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-ink
          [&_svg]:size-5 [&_svg]:shrink-0
          data-[state=on]:[&_svg]:text-primary
        `,
      },
    },
  },
);

function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("inline-flex items-center", className)}
      {...props}
    />
  );
}

type ToggleGroupItemProps = ComponentProps<typeof ToggleGroupPrimitive.Item> &
  Required<VariantProps<typeof toggleGroupItemVariants>>;

function ToggleGroupItem({ className, variant, ...props }: ToggleGroupItemProps) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(toggleGroupItemVariants({ variant, className }))}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
