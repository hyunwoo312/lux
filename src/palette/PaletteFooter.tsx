import { usePaletteShortcut } from "@/hooks/usePaletteShortcut";
import { Kbd } from "@/components/Kbd";

export function PaletteFooter({ inScope }: { inScope: boolean }) {
  const shortcut = usePaletteShortcut();

  return (
    <div
      className="
        border-border bg-foreground/2 text-caption text-ink-2 flex items-center justify-between
        gap-4 border-t px-4 py-2
      "
    >
      <span className="truncate">
        {shortcut.status === "unbound" && "No shortcut assigned"}
        {shortcut.status === "bound" && `${shortcut.shortcut} to open or hide the command palette`}
      </span>
      <span className="flex shrink-0 gap-3">
        {inScope && (
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd> Back
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Kbd>↑↓</Kbd> Navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> Select
        </span>
      </span>
    </div>
  );
}
