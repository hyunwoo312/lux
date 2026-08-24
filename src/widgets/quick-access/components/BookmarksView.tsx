import { useEffect, useRef, useState } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowserMessage } from "@/widgets/quick-access/components/BrowserMessage";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import { useBookmarkTree } from "@/widgets/quick-access/hooks/useBrowserItems";
import { useItemActions } from "@/widgets/quick-access/hooks/useItemActions";
import { resolveFolderTrail } from "@/widgets/quick-access/browser";
import { SearchField } from "@/components/SearchField";
import { searchBookmarks } from "@/widgets/quick-access/lib/search";
import {
  QA_GRID_CONTAINER,
  QA_LIST_CONTAINER,
  qaTileClass,
} from "@/widgets/quick-access/lib/itemStyles";
import type { BookmarkFolder, QuickAccessView } from "@/widgets/quick-access/types";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function BookmarksView({ editing }: { editing: boolean }) {
  const instanceId = useWidgetInstanceId();
  const state = useBookmarkTree();
  const view = useQuickAccess((d) => d.view);
  const path = useQuickAccess((d) => d.bookmarkPath);
  const setBookmarkPath = useQuickAccessStore((s) => s.setBookmarkPath);
  const { pinnedUrls, openBehavior, open, togglePin } = useItemActions();
  const [query, setQuery] = useState("");
  const setPath = (next: string[]) => setBookmarkPath(instanceId, next);
  const scrollRef = useRef<HTMLDivElement>(null);
  const folderId = path[path.length - 1] ?? "";

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [folderId]);

  if (state.status === "loading") return <BrowserMessage>Loading bookmarks…</BrowserMessage>;
  if (state.status === "error") return <BrowserMessage>Couldn’t load bookmarks</BrowserMessage>;

  const trail = resolveFolderTrail(state.root, path);
  const current = trail[trail.length - 1] ?? state.root;
  const reachedPath = trail.slice(1).map((folder) => folder.id);
  const isEmpty = current.folders.length === 0 && current.items.length === 0;
  const searching = query.trim().length > 0;
  const found = searching ? searchBookmarks(state.root, query) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-0.5 pt-1 pb-1.5">
        <SearchField value={query} onChange={setQuery} label="Search bookmarks" />
      </div>
      {!searching && trail.length > 1 && (
        <Breadcrumb trail={trail} onNavigate={(depth) => setPath(reachedPath.slice(0, depth))} />
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-hidden scroll-fade overflow-y-auto">
        {searching ? (
          found.length === 0 ? (
            <BrowserMessage>{`No bookmarks match “${query.trim()}”`}</BrowserMessage>
          ) : (
            <BrowserList
              items={found}
              view={view}
              animateLayout={!editing}
              pinnedUrls={pinnedUrls}
              scrollRef={scrollRef}
              openBehavior={openBehavior}
              onOpen={open}
              onTogglePin={togglePin}
            />
          )
        ) : isEmpty ? (
          <BrowserMessage>
            {trail.length > 1 ? "This folder is empty" : "No bookmarks yet"}
          </BrowserMessage>
        ) : (
          <>
            {current.folders.length > 0 && (
              <ul className={view === "grid" ? QA_GRID_CONTAINER : QA_LIST_CONTAINER}>
                {current.folders.map((folder) => (
                  <FolderTile
                    key={folder.id}
                    folder={folder}
                    view={view}
                    onOpen={() => setPath([...reachedPath, folder.id])}
                  />
                ))}
              </ul>
            )}
            {current.items.length > 0 && (
              <BrowserList
                key={current.id}
                items={current.items}
                view={view}
                animateLayout={!editing}
                pinnedUrls={pinnedUrls}
                scrollRef={scrollRef}
                openBehavior={openBehavior}
                onOpen={open}
                onTogglePin={togglePin}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Breadcrumb({
  trail,
  onNavigate,
}: {
  trail: BookmarkFolder[];
  onNavigate: (depth: number) => void;
}) {
  return (
    <nav aria-label="Bookmark folders" className="flex shrink-0 items-center gap-0.5 px-1 pb-1.5">
      {trail.map((folder, index) => {
        const isCurrent = index === trail.length - 1;
        return (
          <span key={folder.id} className="flex min-w-0 items-center gap-0.5">
            {index > 0 && <ChevronRight className="text-ink-4 size-3 shrink-0" aria-hidden />}
            <button
              type="button"
              onClick={() => onNavigate(index)}
              aria-current={isCurrent ? "page" : undefined}
              disabled={isCurrent}
              className={cn(
                "press",
                "text-micro max-w-28 truncate rounded-sm px-1 py-0.5",
                isCurrent ? "text-ink font-semibold" : "text-ink-3 hover:text-ink cursor-pointer",
              )}
            >
              {folder.title}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

function FolderTile({
  folder,
  view,
  onOpen,
}: {
  folder: BookmarkFolder;
  view: QuickAccessView;
  onOpen: () => void;
}) {
  const count = folder.folders.length + folder.items.length;
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open folder ${folder.title}`}
        className={cn("press cursor-pointer", qaTileClass(view))}
      >
        <span
          className={cn(
            "text-ink-3 grid shrink-0 place-items-center",
            view === "grid" ? "size-8 [&_svg]:size-5" : "size-4 [&_svg]:size-4",
          )}
        >
          <Folder />
        </span>
        <span
          className={cn(
            "truncate",
            view === "grid" ? "w-full text-center text-caption" : "min-w-0 flex-1 text-body",
          )}
        >
          {folder.title}
        </span>
        {view === "list" && (
          <span className="text-ink-4 text-micro shrink-0 tabular-nums">{count}</span>
        )}
      </button>
    </li>
  );
}
