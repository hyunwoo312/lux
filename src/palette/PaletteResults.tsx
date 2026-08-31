import { SearchX } from "lucide-react";
import { LISTBOX_ID, entryId } from "@/palette/ids";
import { PaletteRow } from "@/palette/PaletteRow";
import type { PaletteEntry, PaletteGroup } from "@/palette/usePaletteEntries";

type PaletteResultsProps = {
  groups: readonly PaletteGroup[];
  emptyMessage: string | null;
  active: number;
  onActivate: (entry: PaletteEntry) => void;
  onHover: (index: number) => void;
};

export function PaletteResults({
  groups,
  emptyMessage,
  active,
  onActivate,
  onHover,
}: PaletteResultsProps) {
  if (groups.length === 0) {
    if (emptyMessage === null) return null;
    return (
      <div className="text-ink-2 flex flex-col items-center gap-3 px-5 py-10 text-center">
        <SearchX className="text-ink-2/60 size-8" />
        <p className="text-body">{emptyMessage}</p>
      </div>
    );
  }

  let index = -1;
  return (
    <div id={LISTBOX_ID} role="listbox" aria-label="Results" className="flex flex-col">
      {groups.map((group) => (
        <div key={group.id} role="group" aria-label={group.label} className="flex flex-col">
          <p
            aria-hidden
            className="
              text-ink-2 text-micro px-(--scrollbar-width) pt-3 pb-1 font-semibold tracking-wider
              uppercase
            "
          >
            {group.label}
          </p>
          {group.entries.map((entry) => {
            index += 1;
            const position = index;
            const shared = {
              id: entryId(position),
              selected: position === active,
              onSelect: () => onActivate(entry),
              onPointerMove: () => onHover(position),
            };
            return entry.kind === "result" ? (
              <PaletteRow
                key={entry.result.id}
                {...shared}
                icon={entry.icon}
                artworkUrl={entry.result.artworkUrl}
                labelSegments={entry.result.labelSegments}
                title={entry.result.label}
                detail={entry.result.detail}
                meta={entry.result.meta}
                metaTone={entry.result.metaTone}
              />
            ) : (
              <PaletteRow
                key={entry.item.id}
                {...shared}
                icon={entry.item.icon}
                artworkUrl={entry.item.artworkUrl}
                title={entry.item.label}
                detail={entry.item.detail}
                meta={entry.item.setup?.reason ?? entry.item.meta}
                dimmed={entry.item.setup != null}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
