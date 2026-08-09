import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE_OUT_QUINT } from "@/lib/motion";
import { COLUMN } from "@/widgets/sports/lib/columns";
import { useChangeFlash } from "@/widgets/sports/hooks/useChangeFlash";
import { rowVariants } from "@/widgets/sports/lib/motion";
import { LiveIndicator } from "@/widgets/sports/components/LiveIndicator";
import { TeamLogo } from "@/widgets/sports/components/TeamLogo";
import { MatchDetail } from "@/widgets/sports/components/MatchDetail";
import { hasMatchDetail } from "@/widgets/sports/lib/detail";
import { matchStatus } from "@/widgets/sports/lib/status";
import type { Match, MatchTeam } from "@/widgets/sports/types";

type TeamSideProps = { team: MatchTeam; state: Match["state"]; side: "away" | "home" };

function TeamSide({ team, state, side }: TeamSideProps) {
  const dim = state === "post" && !team.winner;
  const home = side === "home";
  const align = home ? "text-left" : "text-right";
  const scored = useChangeFlash(team.score, state === "in");
  const reduced = useReducedMotion() ?? false;

  const name = (
    <span className={cn(COLUMN.name, align, dim ? "text-muted-foreground" : "text-foreground")}>
      {team.abbreviation}
    </span>
  );
  const score = (
    <motion.span
      animate={scored && !reduced ? { scale: [1, 1.18, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: EASE_OUT_QUINT }}
      className={cn(
        COLUMN.score,
        align,
        "rounded transition-colors duration-300",
        dim ? "text-muted-foreground" : "text-foreground font-semibold",
        scored && "bg-primary/15 text-primary",
      )}
    >
      {team.score ?? ""}
    </motion.span>
  );

  return home ? (
    <>
      {score}
      {name}
      <TeamLogo src={team.logo} className={COLUMN.logo} />
    </>
  ) : (
    <>
      <TeamLogo src={team.logo} className={COLUMN.logo} />
      {name}
      {score}
    </>
  );
}

type RowProps = {
  teams: ReactNode;
  status: ReactNode;
  detail?: ReactNode;
  label?: string;
};

function Row({ teams, status, detail, label }: RowProps) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const expandable = Boolean(detail);

  const body = (
    <>
      <span aria-hidden className="flex-1" />
      <div className="flex shrink-0 items-center gap-1">{teams}</div>
      <div className="flex flex-1 justify-end">{status}</div>
    </>
  );

  return (
    <motion.li variants={rowVariants(reduced)} className="rounded-lg">
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={label}
          onClick={() => setOpen((value) => !value)}
          className="
            hover:bg-foreground/[0.04]
            focus-visible:bg-foreground/[0.04]
            flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left outline-none
            transition-colors
          "
        >
          {body}
        </button>
      ) : (
        <div className="flex items-center gap-2 px-2 py-2.5">{body}</div>
      )}
      <AnimatePresence initial={false}>
        {open && detail ? (
          <motion.div
            id={detailId}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT_QUINT }}
          >
            {detail}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

export function MatchRow({ match, now }: { match: Match; now: number }) {
  const live = match.state === "in";

  return (
    <Row
      teams={
        <>
          <TeamSide team={match.away} state={match.state} side="away" />
          <span
            aria-hidden
            className={cn(COLUMN.separator, "text-muted-foreground/40 text-center text-xs")}
          >
            –
          </span>
          <TeamSide team={match.home} state={match.state} side="home" />
        </>
      }
      label={`${match.away.abbreviation} versus ${match.home.abbreviation}, show details`}
      detail={hasMatchDetail(match) ? <MatchDetail match={match} /> : undefined}
      status={
        <div className="min-w-0">
          <div
            className={cn(
              "text-2xs truncate text-right tabular-nums",
              live ? "text-live font-medium" : "text-muted-foreground",
            )}
          >
            {matchStatus(match, now)}
          </div>
          {live ? <LiveIndicator /> : null}
        </div>
      }
    />
  );
}

export function IdleTeamRow({ abbreviation }: { abbreviation: string }) {
  return (
    <Row
      teams={
        <>
          <TeamLogo className={COLUMN.logo} />
          <span className={cn(COLUMN.name, "text-muted-foreground text-right")}>
            {abbreviation}
          </span>
          <span className={COLUMN.score} />
          <span className={COLUMN.separator} />
        </>
      }
      status={
        <div className="text-muted-foreground/60 text-2xs min-w-0 truncate text-right">No game</div>
      }
    />
  );
}
