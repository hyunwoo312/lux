import { isHttpUrl } from "@/lib/open-url";

export function droppedLink(transfer: Pick<DataTransfer, "getData">): string | null {
  const uri = transfer.getData("text/uri-list");
  const lines = (uri || transfer.getData("text/plain"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (lines.length !== 1 || !lines[0] || !isHttpUrl(lines[0])) return null;
  return new URL(lines[0]).toString();
}
