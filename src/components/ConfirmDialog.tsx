import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
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
  const reduced = useReducedMotion();
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
        className="
          dialog-pop glass-panel w-[min(22rem,calc(100vw-2rem))] bg-[var(--glass-bg-thick)] p-5
        "
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <motion.span
              aria-hidden
              className="
                bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center
                rounded-lg
              "
              initial={reduced ? false : { scale: 0.4, rotate: -16, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 18, delay: 0.05 }
              }
            >
              <Trash2 className="size-5" />
            </motion.span>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!armed}
              className="
                transition-all
                hover:shadow-[0_0_16px_-4px_var(--destructive)]
                motion-safe:active:scale-95
              "
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
