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
          disabled={disabled}
          onClick={() => setConfirmOpen(true)}
          aria-label={label}
          whileHover={reduced ? undefined : { scale: 1.08 }}
          whileTap={reduced ? undefined : { scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="
            text-muted-foreground border-border/60
            hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10
            focus-visible:ring-destructive/40
            flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border
            transition-colors outline-none
            focus-visible:ring-2
            disabled:pointer-events-none disabled:opacity-50
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
