import type { ComponentProps } from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toggleGroupItemVariants = cva(
  `focus-ring cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50`,
  {
    variants: {
      variant: {
        segmented: `
          text-ink-3
          hover:text-ink
          data-[state=on]:text-primary-foreground
          relative rounded-md px-2.5 py-1 text-caption font-medium
        `,
        chip: `
          inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium
          disabled:opacity-40
          [&_img]:size-4
          [&_svg]:size-4
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
