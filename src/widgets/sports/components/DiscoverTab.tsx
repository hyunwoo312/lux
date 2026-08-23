import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/motion";
import { LeaderboardView } from "@/widgets/sports/components/golf/LeaderboardView";
import { LeagueBar } from "@/widgets/sports/components/LeagueBar";
import { LeagueSelector } from "@/widgets/sports/components/LeagueSelector";
import { MatchesView } from "@/widgets/sports/components/match/MatchesView";
import { TennisView } from "@/widgets/sports/components/tennis/TennisView";
import { SportsDayRange } from "@/widgets/sports/components/SportsDayRange";
import { SportsSearch } from "@/widgets/sports/components/SportsSearch";
import { TeamSearchResults } from "@/widgets/sports/components/TeamSearchResults";
import { useCurrentLeague } from "@/widgets/sports/hooks/useCurrentLeague";
import type { Sport } from "@/widgets/sports/lib/leagues";

type Layer = "leagues" | "search" | null;

export function DiscoverTab() {
  const league = useCurrentLeague();
  const reduced = useReducedMotion() ?? false;
  const [layer, setLayer] = useState<Layer>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [query, setQuery] = useState("");

  const openLeagues = (at: Sport | null) => {
    setLayer((current) => (current === "leagues" && sport === at ? null : "leagues"));
    setSport(at);
  };

  const search = (next: string) => {
    setQuery(next);
    setLayer(next.trim().length > 0 ? "search" : null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-1">
      <div className="flex shrink-0 items-center gap-2 px-1">
        <SportsSearch
          value={query}
          onChange={search}
          onFocus={() => query.trim().length > 0 && setLayer("search")}
          label="Search teams in every league"
          placeholder="Search teams…"
        />
        <SportsDayRange />
      </div>

      <LeagueBar
        league={league}
        panel={layer === "leagues" ? "leagues" : null}
        onOpenSports={() => openLeagues(null)}
        onOpenLeagues={() => openLeagues(league.sport)}
      />

      <AnimatePresence initial={false}>
        {layer && (
          <motion.div
            key={layer}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
            className="shrink-0 overflow-hidden"
          >
            {layer === "search" ? (
              <TeamSearchResults query={query} />
            ) : (
              <LeagueSelector sport={sport} onSport={setSport} onPick={() => setLayer(null)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <span aria-hidden className="bg-foreground/8 h-px shrink-0" />

      <div className="scroll-fade min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {league.kind === "leaderboard" ? (
          <LeaderboardView key={league.id} league={league} />
        ) : league.kind === "draw" ? (
          <TennisView key={league.id} league={league} />
        ) : (
          <MatchesView league={league} />
        )}
      </div>
    </div>
  );
}
