import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { qaTileClass } from "@/widgets/quick-access/lib/itemStyles";
import { folderCountLabel, type FolderPreview } from "@/widgets/quick-access/lib/folder-preview";
import type { BookmarkFolder, QuickAccessView } from "@/widgets/quick-access/types";

type Props = {
  folder: BookmarkFolder;
  preview: FolderPreview;
  view: QuickAccessView;
  onOpen: () => void;
};

export function BookmarkFolderTile({ folder, preview, view, onOpen }: Props) {
  const counts = folderCountLabel(preview);
  const contents = preview.titles.join(", ");
  return (
    <li className="group min-w-0">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open folder ${folder.title}`}
        aria-description={`${counts}${contents ? `. Contains ${contents}` : ""}`}
        data-bookmark-target={`folder:${folder.id}`}
        title={`${folder.title} — ${counts}${contents ? `\n${contents}` : ""}`}
        className={cn("press", qaTileClass(view), view === "grid" && "h-full gap-1")}
      >
        <Folder
          aria-hidden
          className={cn("text-ink-3 shrink-0", view === "grid" ? "my-1 size-6" : "size-4")}
        />
        <span className={cn("flex min-w-0 flex-1 flex-col gap-0.5", view === "grid" && "w-full")}>
          <span className={cn("truncate", view === "grid" ? "text-caption" : "text-body")}>
            {folder.title}
          </span>
          <span className="text-ink-3 truncate text-micro tabular-nums">{counts}</span>
          {view === "list" && contents && (
            <span className="text-ink-3 truncate text-caption">{contents}</span>
          )}
        </span>
      </button>
    </li>
  );
}
