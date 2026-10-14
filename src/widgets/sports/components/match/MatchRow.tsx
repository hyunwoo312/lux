import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { collapse, rowVariants } from "@/lib/motion";
import { MatchTeams } from "@/widgets/sports/components/match/MatchTeams";
import { MatchDetail } from "@/widgets/sports/components/match/MatchDetail";
import { LiveIndicator } from "@/widgets/sports/components/LiveIndicator";
import { matchStatus } from "@/widgets/sports/lib/status";
import type { Sport } from "@/widgets/sports/lib/leagues";
import type { Match } from "@/widgets/sports/types";

export function MatchRow({
  match,
  sport,
  now,
  hour12,
  followed,
  onOpen,
  selected = false,
}: {
  match: Match;
  sport: Sport;
  now: number;
  hour12: boolean;
  followed?: readonly string[];
  onOpen?: () => void;
  selected?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const live = match.state === "in";
  const status = matchStatus(match, now, hour12);
  return (
    <motion.li variants={rowVariants(reduced)} className="min-w-0 rounded-lg">
      <button
        type="button"
        data-sports-match={match.id}
        aria-expanded={selected || open}
        aria-label={`${match.away.name} versus ${match.home.name}, show details`}
        onClick={onOpen ?? (() => setOpen(!open))}
        className="
          press-row focus-ring
          hover:bg-foreground/5
          flex w-full min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors
        "
      >
        <MatchTeams match={match} followed={followed} />
        <span className="flex w-20 shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "text-micro flex max-w-full items-center gap-1 text-right tabular-nums",
              live ? "text-success" : "text-ink-3",
            )}
          >
            {live && <LiveIndicator />}
            <span className="min-w-0 break-words">{status}</span>
          </span>
          {match.state === "pre" ? (
            <span className="text-ink-3 text-micro">vs</span>
          ) : (
            <ChevronRight aria-hidden className="text-ink-3 size-3" />
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && !onOpen && (
          <motion.div {...collapse(reduced)} className="overflow-hidden">
            <MatchDetail match={match} sport={sport} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function IdleTeamRow({ abbreviation }: { abbreviation: string }) {
  return (
    <li className="text-ink-3 text-caption flex items-center gap-2 px-2 py-2">
      <Star aria-hidden className="size-3" />
      <span>{abbreviation}</span>
      <span className="text-micro ml-auto">No game in this range</span>
    </li>
  );
}
