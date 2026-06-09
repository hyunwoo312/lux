import type { ComponentProps } from "react";
import { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

const DialogOverlay = forwardRef<HTMLDivElement, ComponentProps<typeof DialogPrimitive.Overlay>>(
  function DialogOverlay({ className, ...props }, ref) {
    return (
      <DialogPrimitive.Overlay
        ref={ref}
        data-slot="dialog-overlay"
        className={cn("dialog-overlay fixed inset-0 z-50 bg-black/30 backdrop-blur-sm", className)}
        {...props}
      />
    );
  },
);

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  showClose?: boolean;
  dismissOnClickOutside?: boolean;
};

function DialogContent({
  className,
  children,
  showClose = true,
  dismissOnClickOutside = true,
  onInteractOutside,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      {dismissOnClickOutside ? (
        <DialogPrimitive.Close asChild>
          <DialogOverlay />
        </DialogPrimitive.Close>
      ) : (
        <DialogOverlay />
      )}
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onInteractOutside={(event) => {
          event.preventDefault();
          onInteractOutside?.(event);
        }}
        className={cn(
          `
            dialog-content bg-popover text-popover-foreground border-border fixed inset-0 z-50
            m-auto h-fit rounded-2xl border shadow-xl outline-none
          `,
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            aria-label="Close"
            className="
              text-muted-foreground
              hover:text-foreground hover:bg-accent
              focus-visible:ring-ring
              absolute top-4 right-4 grid size-8 place-items-center rounded-lg transition-colors
              outline-none
              focus-visible:ring-2
            "
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base font-semibold", className)}
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
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export { Dialog, DialogTrigger, DialogContent, DialogOverlay, DialogTitle, DialogDescription };
