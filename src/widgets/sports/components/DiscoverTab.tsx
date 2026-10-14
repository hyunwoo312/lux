import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { collapse } from "@/lib/motion";
import { LeaderboardView } from "@/widgets/sports/components/golf/LeaderboardView";
import { LeagueBar } from "@/widgets/sports/components/LeagueBar";
import { LeagueSelector } from "@/widgets/sports/components/LeagueSelector";
import { MatchesView } from "@/widgets/sports/components/match/MatchesView";
import { TennisView } from "@/widgets/sports/components/tennis/TennisView";
import { SportsDateNavigation } from "@/widgets/sports/components/SportsDateNavigation";
import { useSportsView } from "@/widgets/sports/useSportsViewStore";
import { useSportsViewStore } from "@/widgets/sports/useSportsViewStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { cn } from "@/lib/utils";
import { TeamSearchResults } from "@/widgets/sports/components/TeamSearchResults";
import { useCurrentLeague } from "@/widgets/sports/hooks/useCurrentLeague";
import type { Sport } from "@/widgets/sports/lib/leagues";

export function DiscoverTab() {
  const instanceId = useWidgetInstanceId();
  const league = useCurrentLeague();
  const reduced = useReducedMotion() ?? false;
  const layer = useSportsView((view) => view.panel);
  const [sport, setSport] = useState<Sport | null>(null);
  const query = useSportsView((view) => view.query);

  const openLeagues = (at: Sport | null) => {
    useSportsViewStore.getState().setView(instanceId, {
      query: "",
      searchOpen: false,
      panel: layer === "leagues" && sport === at ? null : "leagues",
    });
    setSport(at);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-1">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1">
        <LeagueBar
          league={league}
          leaguesOpen={layer === "leagues"}
          onOpenSports={() => openLeagues(null)}
          onOpenLeagues={() => openLeagues(league.sport)}
        />
        {league.kind === "match" && <SportsDateNavigation />}
      </div>

      <AnimatePresence initial={false}>
        {(query.trim() || layer) && (
          <motion.div key={layer} {...collapse(reduced)} className="shrink-0 overflow-hidden">
            {query.trim() ? (
              <TeamSearchResults query={query} />
            ) : (
              <LeagueSelector
                sport={sport}
                onSport={setSport}
                onPick={() => useSportsViewStore.getState().setView(instanceId, { panel: null })}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <span aria-hidden className="bg-foreground/8 h-px shrink-0" />

      <div
        className={cn(
          "min-h-0 flex-1",
          league.kind === "match"
            ? "overflow-hidden"
            : "scroll-fade overflow-x-hidden overflow-y-auto",
        )}
      >
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
