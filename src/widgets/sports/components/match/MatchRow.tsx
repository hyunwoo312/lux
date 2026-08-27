import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT, rowVariants } from "@/lib/motion";
import { COLUMN, MATCH_GRID, STATUS_RAIL } from "@/widgets/sports/lib/columns";
import { useChangeFlash } from "@/widgets/sports/hooks/useChangeFlash";
import { LiveIndicator } from "@/widgets/sports/components/LiveIndicator";
import { TeamLogo } from "@/widgets/sports/components/TeamLogo";
import { MatchDetail } from "@/widgets/sports/components/match/MatchDetail";
import { hasMatchDetail } from "@/widgets/sports/lib/detail";
import { matchStatus } from "@/widgets/sports/lib/status";
import type { Sport } from "@/widgets/sports/lib/leagues";
import type { Match, MatchTeam } from "@/widgets/sports/types";

type TeamSideProps = {
  team: MatchTeam;
  decided: boolean;
  side: "away" | "home";
  live: boolean;
  starred: boolean;
};

function TeamSide({ team, decided, side, live, starred }: TeamSideProps) {
  const dim = decided && !team.winner;
  const home = side === "home";
  const scored = useChangeFlash(team.score, live);
  const reduced = useReducedMotion() ?? false;

  return (
    <div className={cn(COLUMN.side, home ? cn("flex-row-reverse", STATUS_RAIL) : undefined)}>
      <TeamLogo src={team.logo} className={COLUMN.logo} />
      <span className={cn(COLUMN.name, dim ? "text-ink-3" : "text-ink")}>
        {starred && (
          <>
            <Star className="mr-0.5 mb-px inline size-2.5 fill-current align-middle" aria-hidden />
            <span className="sr-only">Favourite team, </span>
          </>
        )}
        {team.abbreviation}
      </span>
      <motion.span
        animate={scored && !reduced ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ duration: DURATION.slow, ease: EASE_OUT }}
        className={cn(
          COLUMN.score,
          home ? "text-left" : "text-right",
          "rounded-xs transition-colors duration-300",
          dim ? "text-ink-3 font-medium" : "text-ink font-semibold",
          scored && "bg-primary/15 text-primary",
        )}
      >
        {team.score ?? ""}
      </motion.span>
    </div>
  );
}

type RowProps = {
  away: ReactNode;
  home: ReactNode;
  separator: string;
  status: ReactNode;
  detail?: ReactNode;
  label?: string;
};

function Row({ away, home, separator, status, detail, label }: RowProps) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const expandable = Boolean(detail);

  const body = (
    <>
      {away}
      <span aria-hidden className={COLUMN.separator}>
        {separator}
      </span>
      {home}
      <div
        className="
          text-ink-3 pointer-events-none absolute top-1/2 right-2 flex max-w-[4.25rem]
          -translate-y-1/2 items-center gap-1
        "
      >
        {status}
      </div>
    </>
  );

  return (
    <motion.li variants={rowVariants(reduced)} className="rounded-xl">
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={label}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            MATCH_GRID,
            `
              press-row focus-ring
              hover:bg-foreground/5
              focus-visible:bg-foreground/5
              relative w-full cursor-pointer rounded-xl px-2 py-2.5 text-left transition-colors
            `,
          )}
        >
          {body}
        </button>
      ) : (
        <div className={cn(MATCH_GRID, "relative px-2 py-2.5")}>{body}</div>
      )}
      <AnimatePresence initial={false}>
        {open && detail ? (
          <motion.div
            id={detailId}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
          >
            {detail}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

export function MatchRow({
  match,
  sport,
  now,
  hour12,
  followed,
}: {
  match: Match;
  sport: Sport;
  now: number;
  hour12: boolean;
  followed?: readonly string[];
}) {
  const live = match.state === "in";
  const decided = match.state === "post" && (match.home.winner || match.away.winner);

  return (
    <Row
      away={
        <TeamSide
          team={match.away}
          decided={decided}
          live={live}
          side="away"
          starred={followed?.includes(match.away.abbreviation) ?? false}
        />
      }
      home={
        <TeamSide
          team={match.home}
          decided={decided}
          live={live}
          side="home"
          starred={followed?.includes(match.home.abbreviation) ?? false}
        />
      }
      separator={match.state === "pre" ? "vs" : "–"}
      label={`${match.away.abbreviation} versus ${match.home.abbreviation}, show details`}
      detail={hasMatchDetail(match) ? <MatchDetail match={match} sport={sport} /> : undefined}
      status={
        <>
          {live ? <LiveIndicator /> : null}
          <span
            className={cn(
              "text-micro min-w-0 truncate text-right tabular-nums",
              live ? "text-success font-medium" : "text-ink-3",
            )}
          >
            {matchStatus(match, now, hour12)}
          </span>
        </>
      }
    />
  );
}

export function IdleTeamRow({ abbreviation }: { abbreviation: string }) {
  return (
    <Row
      away={
        <div className={COLUMN.side}>
          <TeamLogo className={COLUMN.logo} />
          <span className={cn(COLUMN.name, "text-ink-3")}>{abbreviation}</span>
          <span className={COLUMN.score} />
        </div>
      }
      home={<span />}
      separator=""
      status={<span className="text-ink-3 text-micro min-w-0 truncate text-right">No game</span>}
    />
  );
}
