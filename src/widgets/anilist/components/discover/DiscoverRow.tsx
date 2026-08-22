import { Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { ROW } from "@/lib/row";
import { cn } from "@/lib/utils";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { listStatusLabel } from "@/widgets/anilist/lib/list-status";
import type { DiscoverMedia, ListStatus } from "@/widgets/anilist/types";

type DiscoverRowProps = {
  media: DiscoverMedia;
  newTab: boolean;
  listStatus?: ListStatus;
  canAdd: boolean;
  pending: boolean;
  onAdd: () => void;
};

function describeMedia(media: DiscoverMedia): string {
  const parts: string[] = [];
  if (media.format) parts.push(media.format.replace(/_/g, " "));
  if (media.episodes) parts.push(`${media.episodes} ep`);
  if (media.genres?.length) parts.push(media.genres.join(" · "));
  return parts.join(" — ");
}

export function DiscoverRow({
  media,
  newTab,
  listStatus,
  canAdd,
  pending,
  onAdd,
}: DiscoverRowProps) {
  const meta = describeMedia(media);

  return (
    <li className="flex items-center gap-1">
      <a
        href={media.siteUrl}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        className={cn(ROW.itemAction, "min-w-0 flex-1")}
      >
        <MediaCover
          src={media.coverImage}
          srcSmall={media.coverImageSmall}
          size="thumb"
          title={media.title}
          color={media.coverColor}
          className="h-12 w-9 rounded-md"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="text-ink truncate text-caption font-medium">{media.title}</p>
            {listStatus && (
              <span className="border-border text-ink-3 text-micro shrink-0 rounded-sm border px-1.5">
                {listStatusLabel(listStatus, media.kind)}
              </span>
            )}
          </div>
          {meta && <p className="text-ink-3 text-micro truncate">{meta}</p>}
        </div>
        {media.averageScore !== undefined && (
          <span className="text-ink-3 text-micro shrink-0 font-semibold tabular-nums">
            {media.averageScore}%
          </span>
        )}
      </a>
      {canAdd && !listStatus && (
        <Tooltip content="Add to Planning">
          <button
            type="button"
            aria-label={`Add ${media.title} to Planning`}
            disabled={pending}
            onClick={onAdd}
            className="
              press focus-ring text-ink-4
              hover:text-ink
              grid size-7 shrink-0 cursor-pointer place-items-center rounded-sm
              disabled:pointer-events-none disabled:opacity-50
            "
          >
            {pending ? <Spinner className="size-4" /> : <Plus className="size-4" aria-hidden />}
          </button>
        </Tooltip>
      )}
    </li>
  );
}
