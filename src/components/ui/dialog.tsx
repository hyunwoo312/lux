import { useRef, type ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import { Button } from "@/components/ui/button";

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
    dialog-content text-popover-foreground z-modal fixed inset-0 m-auto h-fit
    max-w-[calc(100vw-2rem)] outline-none
  `,
  {
    variants: {
      surface: {
        panel: "bg-popover glass-panel rounded-3xl",
        glass: "glass rounded-2xl",
      },
      layout: {
        default: "",
        flush: "flex flex-col gap-0 overflow-hidden p-0",
      },
      width: {
        xs: "w-[22rem]",
        sm: "w-[28rem]",
        md: "w-[32.5rem]",
        lg: "w-[46rem]",
        xl: "w-[52rem]",
        "2xl": "w-[60rem]",
      },
    },
    defaultVariants: {
      surface: "panel",
      layout: "default",
      width: "md",
    },
  },
);

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogContentVariants> & {
    showClose?: boolean;
    dismissOnClickOutside?: boolean;
    overDialog?: boolean;
    initialFocus?: "first" | "container";
  };

function isSearchWithText(element: Element | null): boolean {
  return element instanceof HTMLInputElement && element.type === "search" && element.value !== "";
}

function DialogContent({
  className,
  children,
  surface,
  layout,
  width,
  showClose = true,
  dismissOnClickOutside = true,
  overDialog = false,
  initialFocus = "first",
  onInteractOutside,
  onEscapeKeyDown,
  onOpenAutoFocus,
  ...props
}: DialogContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay className={overDialog ? "z-modal" : "z-overlay"} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        ref={contentRef}
        tabIndex={initialFocus === "container" ? -1 : undefined}
        onInteractOutside={(event) => {
          if (!dismissOnClickOutside) event.preventDefault();
          onInteractOutside?.(event);
        }}
        onEscapeKeyDown={(event) => {
          if (isSearchWithText(document.activeElement)) event.preventDefault();
          onEscapeKeyDown?.(event);
        }}
        onOpenAutoFocus={(event) => {
          if (initialFocus === "container") {
            event.preventDefault();
            contentRef.current?.focus();
          }
          onOpenAutoFocus?.(event);
        }}
        className={cn(dialogContentVariants({ surface, layout, width, className }))}
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
    <Button
      asChild
      variant="ghost"
      size="icon"
      className={cn("text-ink-3 hover:text-ink", className)}
    >
      <DialogPrimitive.Close aria-label="Close">
        <X />
      </DialogPrimitive.Close>
    </Button>
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
