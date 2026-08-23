import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const ARM_MS = 400;

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setArmed(false);
      return;
    }
    const id = window.setTimeout(() => setArmed(true), ARM_MS);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        overDialog
        overlayClassName="backdrop-blur-[6px]"
        className="dialog-pop w-[min(22rem,calc(100vw-2rem))] p-5"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="
                bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center
                rounded-lg
              "
            >
              <Trash2 className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button size="lg" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="destructive"
              disabled={!armed}
              onClick={() => {
                onOpenChange(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
