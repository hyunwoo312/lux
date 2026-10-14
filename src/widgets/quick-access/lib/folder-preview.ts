import type { BookmarkFolder } from "@/widgets/quick-access/types";

export type FolderPreview = { links: number; folders: number; titles: string[] };

export function folderPreviews(root: BookmarkFolder): ReadonlyMap<string, FolderPreview> {
  const previews = new Map<string, FolderPreview>();
  const visit = (folder: BookmarkFolder) => {
    previews.set(folder.id, {
      links: folder.items.length,
      folders: folder.folders.length,
      titles: [
        ...folder.folders.slice(0, 3).map((child) => child.title),
        ...folder.items.slice(0, 3).map((item) => item.title),
      ].slice(0, 3),
    });
    for (const child of folder.folders) visit(child);
  };
  visit(root);
  return previews;
}

export function folderCountLabel({ links, folders }: FolderPreview): string {
  return [
    `${links} ${links === 1 ? "link" : "links"}`,
    ...(folders ? [`${folders} ${folders === 1 ? "folder" : "folders"}`] : []),
  ].join(" · ");
}
