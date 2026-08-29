import { tap } from "@/lib/motion";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Tooltip } from "@/components/ui/tooltip";

type ClearImagesButtonProps = {
  label: string;
  count: number;
  disabled?: boolean;
  onClear: () => void;
};

export function ClearImagesButton({
  label,
  count,
  disabled = false,
  onClear,
}: ClearImagesButtonProps) {
  const reduced = useReducedMotion();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Tooltip content={label}>
        <motion.button
          type="button"
          onClick={disabled ? undefined : () => setConfirmOpen(true)}
          aria-disabled={disabled || undefined}
          aria-label={label}
          {...tap(reduced || disabled, "control")}
          className="
            focus-ring text-ink-3 border-border/60
            hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10
            flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm border
            transition-colors
            aria-disabled:cursor-not-allowed aria-disabled:opacity-50
            [&_svg]:size-4
          "
        >
          <Trash2 aria-hidden />
        </motion.button>
      </Tooltip>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={count === 1 ? "Remove this image?" : `Remove all ${count} images?`}
        description="Deleted images can't be restored."
        confirmLabel="Remove"
        onConfirm={onClear}
      />
    </>
  );
}
