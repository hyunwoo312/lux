import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/StateMessage";
import { useNow } from "@/hooks/useNow";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { FavoriteLeagueSection } from "@/widgets/sports/components/FavoriteLeagueSection";
import { FavoriteTourSection } from "@/widgets/sports/components/FavoriteTourSection";
import { SportsDateNavigation } from "@/widgets/sports/components/SportsDateNavigation";
import { MatchFilters } from "@/widgets/sports/components/match/MatchFilters";
import { useSportsView } from "@/widgets/sports/useSportsViewStore";
import { useSportsDate } from "@/widgets/sports/hooks/useSportsDate";
import { peekPolledResource, useResourceGroup } from "@/widgets/core/usePolledResource";
import { scoreboardKey } from "@/widgets/sports/lib/cacheKeys";
import { datesParam } from "@/widgets/sports/lib/window";
import { matchesTeam } from "@/widgets/sports/lib/espn";
import type { Scoreboard } from "@/widgets/sports/lib/scoreboardDays";
import { matchesQuery } from "@/lib/utils";
import { followedLeagues } from "@/widgets/sports/lib/roster";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

export function FavoritesTab() {
  const instanceId = useWidgetInstanceId();
  const following = useSports((d) => d.following);
  const dayWindow = useSports((d) => d.window);
  const setTab = useSportsStore((s) => s.setTab);
  const now = useNow(30_000).getTime();
  const query = useSportsView((view) => view.query);
  const date = useSportsDate();

  const entries = followedLeagues(following);
  const sections = entries.filter((row) => row.league.kind === "match");
  const tours = entries.filter((row) => row.league.kind !== "match");
  const keys = sections.map(({ league }) =>
    scoreboardKey(league, dayWindow, datesParam(dayWindow, date)),
  );
  useResourceGroup(keys);
  const matches = sections.flatMap(({ teams }, index) =>
    (peekPolledResource<Scoreboard>(keys[index]!)?.matches ?? []).filter(
      (match) =>
        teams.some((team) => matchesTeam(match, team)) &&
        (!query.trim() ||
          matchesQuery(
            `${match.away.fullName ?? match.away.name} ${match.home.fullName ?? match.home.name} ${match.away.abbreviation} ${match.home.abbreviation}`,
            query,
          )),
    ),
  );

  if (entries.length === 0) {
    return (
      <StateMessage
        icon={Star}
        message="Follow teams or tours in Discover to see them here."
        action={
          <Button variant="outline" onClick={() => setTab(instanceId, "discover")}>
            Browse leagues
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-1">
      {sections.length > 0 && (
        <>
          <div className="flex shrink-0 items-center justify-between px-1">
            <span className="text-ink-3 text-caption">Following</span>
            <SportsDateNavigation />
          </div>
          <MatchFilters matches={matches} />
        </>
      )}
      <div className="scroll-fade flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto">
        {tours.map(({ league }) => (
          <FavoriteTourSection key={league.id} league={league} query={query} />
        ))}
        {sections.map(({ league, teams }) => (
          <FavoriteLeagueSection
            key={league.id}
            league={league}
            dayWindow={dayWindow}
            teams={teams}
            query={query}
            now={now}
          />
        ))}
      </div>
    </div>
  );
}
