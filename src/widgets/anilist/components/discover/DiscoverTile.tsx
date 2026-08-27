import { Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { ART_ACTION, ART_SCRIM, ART_SCRIM_ACTIONS } from "@/widgets/anilist/components/coverGrid";
import { listStatusLabel } from "@/widgets/anilist/lib/list-status";
import type { DiscoverMedia, ListStatus } from "@/widgets/anilist/types";

type DiscoverTileProps = {
  media: DiscoverMedia;
  newTab: boolean;
  listStatus?: ListStatus;
  canAdd: boolean;
  pending: boolean;
  onAdd: () => void;
};

export function DiscoverTile({
  media,
  newTab,
  listStatus,
  canAdd,
  pending,
  onAdd,
}: DiscoverTileProps) {
  const format = media.format?.replace(/_/g, " ");
  const showAdd = canAdd && !listStatus;

  return (
    <li className="group relative">
      <a
        href={media.siteUrl}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        className="press focus-ring block rounded-lg"
      >
        <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-lg">
          <MediaCover
            src={media.coverImage}
            srcSmall={media.coverImageSmall}
            title={media.title}
            color={media.coverColor}
            className="absolute inset-0 size-full rounded-none"
          />
          {listStatus && (
            <span
              className="
                text-micro absolute top-1 right-1 rounded-sm bg-black/60 px-1 py-px text-white
              "
            >
              {listStatusLabel(listStatus, media.kind)}
            </span>
          )}
          <span className={cn(ART_SCRIM, showAdd && ART_SCRIM_ACTIONS)}>
            <span className="text-micro block truncate leading-snug font-medium text-white">
              {media.title}
            </span>
            <span className="text-micro mt-0.5 flex min-w-0 items-center gap-1 text-white">
              {media.averageScore !== undefined && (
                <span className="font-semibold tabular-nums">{media.averageScore}%</span>
              )}
              {format && <span className="truncate">{format}</span>}
              {media.episodes ? (
                <span className="shrink-0 tabular-nums">{media.episodes} ep</span>
              ) : null}
            </span>
          </span>
        </span>
      </a>
      {showAdd && (
        <Tooltip content="Add to Planning">
          <button
            type="button"
            aria-label={`Add ${media.title} to Planning`}
            disabled={pending}
            onClick={onAdd}
            className={cn(
              ART_ACTION,
              "absolute inset-x-1.5 bottom-1 disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {pending ? <Spinner className="size-3.5" /> : <Plus className="size-3.5" aria-hidden />}
          </button>
        </Tooltip>
      )}
    </li>
  );
}
