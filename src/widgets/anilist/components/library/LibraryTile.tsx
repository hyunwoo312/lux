import { Minus, Plus, Star, type LucideIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { AiringBadge } from "@/widgets/anilist/components/library/AiringBadge";
import { ART_SCRIM, ART_SCRIM_ACTIONS } from "@/widgets/anilist/components/coverGrid";
import {
  progressSpeech,
  promoteAction,
  stepLabels,
} from "@/widgets/anilist/components/library/entry-actions";
import { formatScore, progressLabel } from "@/widgets/anilist/lib/current";
import type { CurrentEntry, ScoreFormat } from "@/widgets/anilist/types";

type LibraryTileProps = {
  entry: CurrentEntry;
  newTab: boolean;
  scoreFormat: ScoreFormat;
  pending: boolean;
  inProgress: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onPromote: () => void;
};

export function LibraryTile({
  entry,
  newTab,
  scoreFormat,
  pending,
  inProgress,
  onIncrement,
  onDecrement,
  onPromote,
}: LibraryTileProps) {
  const canIncrement = entry.total == null || entry.progress < entry.total;
  const canDecrement = entry.progress > 0;
  const scoreText = entry.score != null ? formatScore(entry.score, scoreFormat) : null;
  const showScoreIcon = scoreFormat !== "POINT_5" && scoreFormat !== "POINT_3";
  const steps = stepLabels(entry);
  const promote = promoteAction(entry);
  const hasActions = inProgress ? canIncrement || canDecrement : true;

  return (
    <li className="group relative">
      <a
        href={entry.siteUrl}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        className="press focus-ring block rounded-lg"
      >
        <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-lg">
          <MediaCover
            src={entry.coverImage}
            srcSmall={entry.coverImageSmall}
            title={entry.title}
            color={entry.coverColor}
            className="absolute inset-0 size-full rounded-none"
          />
          {scoreText != null && (
            <span
              className="
                text-micro absolute top-1 left-1 inline-flex items-center gap-0.5 rounded-sm
                bg-black/60 px-1 py-px text-white tabular-nums
              "
            >
              <span className="sr-only">Your score: {scoreText}</span>
              {showScoreIcon && <Star className="size-2.5" aria-hidden />}
              <span aria-hidden>{scoreText}</span>
            </span>
          )}
          {entry.nextEpisode && (
            <AiringBadge
              airingAt={entry.nextEpisode.airingAt}
              episode={entry.nextEpisode.episode}
              tone="art"
              className="
                text-micro absolute top-1 right-1 rounded-sm bg-black/60 px-1 py-px text-white
              "
            />
          )}
          <span className={cn(ART_SCRIM, hasActions && ART_SCRIM_ACTIONS)}>
            <span className="text-micro block truncate leading-snug font-medium text-white">
              {entry.title}
            </span>
            <span className="text-micro mt-0.5 block truncate text-white tabular-nums" aria-hidden>
              {progressLabel(entry)}
            </span>
            <span className="sr-only">{progressSpeech(entry)}</span>
          </span>
        </span>
      </a>
      {hasActions && (
        <div className="absolute inset-x-1.5 bottom-1 flex gap-1">
          {pending ? (
            <span
              className="
                flex h-6 flex-1 items-center justify-center rounded-sm bg-white/15 text-white
              "
            >
              <Spinner className="size-3.5" />
            </span>
          ) : inProgress ? (
            <>
              {canDecrement && (
                <TileButton
                  icon={Minus}
                  label={steps.decrement.label}
                  tooltip={steps.decrement.tooltip}
                  onClick={onDecrement}
                />
              )}
              {canIncrement && (
                <TileButton
                  icon={Plus}
                  label={steps.increment.label}
                  tooltip={steps.increment.tooltip}
                  onClick={onIncrement}
                />
              )}
            </>
          ) : (
            <TileButton
              icon={promote.icon}
              label={promote.label}
              tooltip={promote.tooltip}
              onClick={onPromote}
            />
          )}
        </div>
      )}
    </li>
  );
}

function TileButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="
          press focus-ring flex h-6 min-w-6 flex-1 cursor-pointer items-center justify-center
          rounded-sm bg-white/15 text-white
          hover:bg-white/30
        "
      >
        <Icon className="size-3.5" aria-hidden />
      </button>
    </Tooltip>
  );
}
