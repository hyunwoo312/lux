import type { ComponentProps } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function Select(props: ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectValue(props: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        `
          border-input bg-background/60 ring-offset-background
          focus-visible:border-ring focus-visible:ring-ring/30
          data-[placeholder]:text-muted-foreground
          flex h-8 w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1 text-xs
          whitespace-nowrap transition-colors outline-none
          focus-visible:ring-2
          disabled:cursor-not-allowed disabled:opacity-50
          [&_svg]:size-3.5 [&_svg]:shrink-0
        `,
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          `
            bg-popover text-popover-foreground border-border
            data-[state=open]:animate-in
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
            data-[state=open]:fade-in-0
            data-[state=closed]:zoom-out-95
            data-[state=open]:zoom-in-95
            relative z-50 max-h-72 overflow-hidden rounded-md border p-1 shadow-lg
          `,
          position === "popper" &&
            `
              w-[var(--radix-select-trigger-width)]
              data-[side=bottom]:translate-y-1
              data-[side=top]:-translate-y-1
            `,
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="w-full p-0">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        `
          focus:bg-accent focus:text-accent-foreground
          relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-7 pl-2 text-xs
          outline-none select-none
          data-[disabled]:pointer-events-none data-[disabled]:opacity-50
        `,
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
