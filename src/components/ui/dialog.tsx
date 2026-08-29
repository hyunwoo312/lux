import type { ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";

function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("dialog-overlay bg-scrim fixed inset-0", className)}
      {...props}
    />
  );
}

const dialogContentVariants = cva(
  `
    dialog-content bg-popover text-popover-foreground glass-panel z-modal fixed inset-0 m-auto h-fit
    rounded-3xl outline-none
  `,
  {
    variants: {
      layout: {
        default: "",
        flush: "flex flex-col gap-0 overflow-hidden p-0",
      },
    },
    defaultVariants: {
      layout: "default",
    },
  },
);

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogContentVariants> & {
    showClose?: boolean;
    dismissOnClickOutside?: boolean;
    overDialog?: boolean;
  };

function DialogContent({
  className,
  children,
  layout,
  showClose = true,
  dismissOnClickOutside = true,
  overDialog = false,
  onInteractOutside,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay className={overDialog ? "z-modal" : "z-overlay"} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onInteractOutside={(event) => {
          if (!dismissOnClickOutside) event.preventDefault();
          onInteractOutside?.(event);
        }}
        className={cn(dialogContentVariants({ layout, className }))}
        {...props}
      >
        {children}
        {showClose && <DialogCloseButton className="absolute top-4 right-4" />}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogCloseButton({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Close
      aria-label="Close"
      className={cn(
        `
          text-ink-3
          hover:text-ink hover:bg-accent
          focus-ring grid size-8 shrink-0 cursor-pointer place-items-center rounded-md
          transition-colors
        `,
        className,
      )}
    >
      <X className="size-4" />
    </DialogPrimitive.Close>
  );
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(TYPE.title, className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-ink-3 text-body", className)}
      {...props}
    />
  );
}

export { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogTitle };
