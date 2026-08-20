import type { ReactNode } from "react";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useNow } from "@/hooks/useNow";
import { IdleTeamRow, MatchRow } from "@/widgets/sports/components/MatchRow";
import { UnverifiedNotice } from "@/widgets/sports/components/UnverifiedNotice";
import { useScoreboard } from "@/widgets/sports/hooks/useScoreboard";
import { followedView } from "@/widgets/sports/lib/roster";
import { offseasonStart } from "@/widgets/sports/lib/status";
import { useSports } from "@/widgets/sports/useSportsStore";
import { listVariants, panelVariants } from "@/widgets/sports/lib/motion";
import type { Match } from "@/widgets/sports/types";

const SEASON_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        text-muted-foreground flex h-full items-center justify-center px-4 text-center text-sm
      "
    >
      {children}
    </div>
  );
}

export function SportsWidget() {
  const { state, league } = useScoreboard();
  const teams = useSports((d) => d.teams);
  const states = useSports((d) => d.states);
  const now = useNow(30_000).getTime();
  const clock24h = useAppSettingsStore((state) => state.clock24h);
  const reduced = useReducedMotion() ?? false;

  const all: Match[] = state.status === "success" ? state.data : [];
  const visible = all.filter((match) => states.includes(match.state));
  const followed = teams.length > 0 ? followedView(visible, all, teams) : null;
  const rows = followed ? followed.matches : visible;
  const idle = followed ? followed.idle : [];
  const returns = offseasonStart(all, now);

  const content =
    state.status === "loading" ? (
      <Placeholder>Loading scores…</Placeholder>
    ) : state.status === "error" ? (
      <Placeholder>Scores are unavailable right now.</Placeholder>
    ) : returns ? (
      <Placeholder>
        {league.label} returns {returns.toLocaleDateString(undefined, SEASON_FORMAT)}.
      </Placeholder>
    ) : state.status === "empty" && teams.length === 0 ? (
      <Placeholder>No {league.label} fixtures scheduled.</Placeholder>
    ) : rows.length === 0 && idle.length === 0 ? (
      <Placeholder>No {league.label} games match this filter.</Placeholder>
    ) : (
      <div className="flex h-full min-h-0 flex-col gap-1">
        {league.liveUnverified ? <UnverifiedNotice label={league.label} /> : null}
        <motion.ul
          variants={listVariants(reduced)}
          initial="hidden"
          animate="show"
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto"
        >
          {rows.map((match) => (
            <MatchRow key={match.id} match={match} now={now} hour12={!clock24h} />
          ))}
          {idle.map((abbreviation) => (
            <IdleTeamRow key={abbreviation} abbreviation={abbreviation} />
          ))}
        </motion.ul>
      </div>
    );

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={league.id}
        variants={panelVariants(reduced)}
        initial="hidden"
        animate="show"
        exit="exit"
        className="h-full"
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}
