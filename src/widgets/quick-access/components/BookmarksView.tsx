import { useMemo, useState } from "react";
import { AlertCircle, Bookmark } from "lucide-react";
import { RetryButton, StateMessage } from "@/components/StateMessage";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import { BookmarkBreadcrumb } from "@/widgets/quick-access/components/BookmarkBreadcrumb";
import { BookmarkFolderTile } from "@/widgets/quick-access/components/BookmarkFolderTile";
import { useBookmarkTree } from "@/widgets/quick-access/hooks/useBrowserItems";
import { useBookmarkNavigation } from "@/widgets/quick-access/hooks/useBookmarkNavigation";
import { useItemActions } from "@/widgets/quick-access/hooks/useItemActions";
import { resolveFolderTrail } from "@/lib/browser";
import { SearchField } from "@/components/SearchField";
import { searchBookmarksWithContext } from "@/widgets/quick-access/lib/search";
import { folderPreviews, type FolderPreview } from "@/widgets/quick-access/lib/folder-preview";
import { QA_GRID_CONTAINER, QA_LIST_CONTAINER } from "@/widgets/quick-access/lib/itemStyles";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function BookmarksView({ editing, active = true }: { editing: boolean; active?: boolean }) {
  const instanceId = useWidgetInstanceId();
  const state = useBookmarkTree(active);
  const root = state.status === "ready" ? state.root : null;
  const view = useQuickAccess((d) => d.view);
  const path = useQuickAccess((d) => d.bookmarkPath);
  const setBookmarkPath = useQuickAccessStore((s) => s.setBookmarkPath);
  const { pinnedUrls, openBehavior, open, togglePin } = useItemActions();
  const [query, setQuery] = useState("");
  const trail = root ? resolveFolderTrail(root, path) : [];
  const current = trail.at(-1) ?? root;
  const reachedPath = trail.slice(1).map((folder) => folder.id);
  const navigation = useBookmarkNavigation({ folderId: current?.id ?? "", query, active });
  const previews = useMemo(
    () => (root ? folderPreviews(root) : new Map<string, FolderPreview>()),
    [root],
  );
  const found = useMemo(() => (root ? searchBookmarksWithContext(root, query) : []), [root, query]);
  const contexts = useMemo(
    () => new Map(found.map((entry) => [entry.item.id, entry.context])),
    [found],
  );
  const searching = query.trim().length > 0;
  const navigate = (next: string[], focus?: string) => {
    navigation.prepare(focus);
    setBookmarkPath(instanceId, next);
  };
  const changeQuery = (next: string) => {
    navigation.remember();
    if (query.trim() && !next.trim()) navigation.prepare();
    setQuery(next);
  };

  if (state.status === "loading") return <StateMessage message="Loading bookmarks…" />;
  if (state.status === "error")
    return (
      <StateMessage
        icon={AlertCircle}
        tone="error"
        message="Couldn’t load bookmarks."
        action={<RetryButton onRetry={state.retry} retrying={false} />}
      />
    );
  if (!current) return null;
  const items = searching ? found.map((entry) => entry.item) : current.items;
  const empty = items.length === 0 && (searching || current.folders.length === 0);
  return (
    <div
      ref={navigation.rootRef}
      tabIndex={-1}
      className="focus-ring flex h-full min-h-0 flex-col rounded-md"
    >
      <div className="shrink-0 px-0.5 pt-1 pb-1.5">
        <SearchField value={query} onChange={changeQuery} label="Search bookmarks" />
      </div>
      {!searching && trail.length > 1 && (
        <BookmarkBreadcrumb
          trail={trail}
          onNavigate={(depth) =>
            navigate(reachedPath.slice(0, depth), `folder:${trail[depth + 1]?.id ?? ""}`)
          }
        />
      )}
      <div
        ref={navigation.scrollRef}
        onScroll={navigation.remember}
        onFocusCapture={navigation.onFocusCapture}
        className="scroll-fade min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-0.5"
      >
        {empty && (
          <StateMessage
            icon={Bookmark}
            message={
              searching
                ? `No bookmarks match “${query.trim()}”`
                : trail.length > 1
                  ? "This folder is empty"
                  : "No bookmarks yet"
            }
          />
        )}
        {!searching && current.folders.length > 0 && (
          <ul className={view === "grid" ? QA_GRID_CONTAINER : QA_LIST_CONTAINER}>
            {current.folders.map((folder) => (
              <BookmarkFolderTile
                key={folder.id}
                folder={folder}
                preview={previews.get(folder.id) ?? { links: 0, folders: 0, titles: [] }}
                view={view}
                onOpen={() => navigate([...reachedPath, folder.id])}
              />
            ))}
          </ul>
        )}
        <BrowserList
          scopeKey={navigation.scopeKey}
          items={items}
          contexts={searching ? contexts : undefined}
          view={view}
          animateLayout={!editing}
          pinnedUrls={pinnedUrls}
          scrollRef={navigation.scrollRef}
          openBehavior={openBehavior}
          onOpen={open}
          onTogglePin={togglePin}
        />
      </div>
    </div>
  );
}
