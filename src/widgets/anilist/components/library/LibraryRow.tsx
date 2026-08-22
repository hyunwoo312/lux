import { Minus, Plus, Star } from "lucide-react";
import { IconActionButton } from "@/components/IconActionButton";
import { Spinner } from "@/components/ui/spinner";
import { ROW } from "@/lib/row";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { AiringBadge } from "@/widgets/anilist/components/library/AiringBadge";
import {
  progressSpeech,
  promoteAction,
  stepLabels,
} from "@/widgets/anilist/components/library/entry-actions";
import { formatScore, progressLabel } from "@/widgets/anilist/lib/current";
import type { CurrentEntry, ScoreFormat } from "@/widgets/anilist/types";

type LibraryRowProps = {
  entry: CurrentEntry;
  newTab: boolean;
  scoreFormat: ScoreFormat;
  pending: boolean;
  inProgress: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onPromote: () => void;
};

export function LibraryRow({
  entry,
  newTab,
  scoreFormat,
  pending,
  inProgress,
  onIncrement,
  onDecrement,
  onPromote,
}: LibraryRowProps) {
  const canIncrement = entry.total == null || entry.progress < entry.total;
  const canDecrement = entry.progress > 0;
  const scoreText = entry.score != null ? formatScore(entry.score, scoreFormat) : null;
  const showScoreIcon = scoreFormat !== "POINT_5" && scoreFormat !== "POINT_3";
  const steps = stepLabels(entry);
  const promote = promoteAction(entry);

  return (
    <li className="flex items-center gap-1 pr-1">
      <a
        href={entry.siteUrl}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        className={cn(ROW.itemAction, "min-w-0 flex-1")}
      >
        <MediaCover
          src={entry.coverImage}
          srcSmall={entry.coverImageSmall}
          size="thumb"
          title={entry.title}
          color={entry.coverColor}
          className="h-12 w-9 rounded-md"
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-ink min-w-0 truncate text-caption font-medium">
              {entry.title}
            </span>
          </span>
          <span className="text-ink-3 text-micro flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 tabular-nums" aria-hidden>
              {progressLabel(entry)}
            </span>
            <span className="sr-only">{progressSpeech(entry)}</span>
            {entry.nextEpisode && (
              <AiringBadge
                airingAt={entry.nextEpisode.airingAt}
                episode={entry.nextEpisode.episode}
              />
            )}
          </span>
        </span>
      </a>
      <div className="flex shrink-0 items-center gap-0.5">
        {scoreText != null && (
          <span className={cn(TYPE.rowMeta, "inline-flex items-center gap-0.5 tabular-nums")}>
            <span className="sr-only">Your score: {scoreText}</span>
            {showScoreIcon && <Star className="size-2.5" aria-hidden />}
            <span aria-hidden>{scoreText}</span>
          </span>
        )}
        {pending ? (
          <span className="text-ink-3 flex size-8 items-center justify-center">
            <Spinner className="size-3.5" />
          </span>
        ) : inProgress ? (
          <>
            {canDecrement && (
              <IconActionButton
                icon={Minus}
                label={steps.decrement.label}
                tooltip={steps.decrement.tooltip}
                onClick={onDecrement}
              />
            )}
            {canIncrement && (
              <IconActionButton
                icon={Plus}
                label={steps.increment.label}
                tooltip={steps.increment.tooltip}
                onClick={onIncrement}
              />
            )}
          </>
        ) : (
          <IconActionButton
            icon={promote.icon}
            label={promote.label}
            tooltip={promote.tooltip}
            onClick={onPromote}
          />
        )}
      </div>
    </li>
  );
}
