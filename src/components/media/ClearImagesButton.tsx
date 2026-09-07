import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Tooltip content={label}>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={disabled ? undefined : () => setConfirmOpen(true)}
          aria-disabled={disabled || undefined}
          aria-label={label}
          className="
            text-ink-3 border-border/60
            hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive
          "
        >
          <Trash2 aria-hidden />
        </Button>
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
