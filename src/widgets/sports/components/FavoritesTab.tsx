import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/StateMessage";
import { useNow } from "@/hooks/useNow";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { FavoriteLeagueSection } from "@/widgets/sports/components/FavoriteLeagueSection";
import { FavoriteTourSection } from "@/widgets/sports/components/FavoriteTourSection";
import { SportsDayRange } from "@/widgets/sports/components/SportsDayRange";
import { SearchField } from "@/components/SearchField";
import { followedLeagues } from "@/widgets/sports/lib/roster";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

export function FavoritesTab() {
  const instanceId = useWidgetInstanceId();
  const following = useSports((d) => d.following);
  const dayWindow = useSports((d) => d.window);
  const setTab = useSportsStore((s) => s.setTab);
  const now = useNow(30_000).getTime();
  const [query, setQuery] = useState("");

  const entries = followedLeagues(following);
  const sections = entries.filter((row) => row.league.kind === "match");
  const tours = entries.filter((row) => row.league.kind !== "match");

  if (entries.length === 0) {
    return (
      <StateMessage
        icon={Star}
        message="Follow a team to see its games here. Search for one above, or pick a league in Discover."
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
      <div className="flex shrink-0 items-center gap-2 px-1">
        <SearchField
          value={query}
          onChange={setQuery}
          label="Filter the teams you follow"
          placeholder="Filter followed teams…"
          size="sm"
          className="min-w-0 flex-1"
        />
        <SportsDayRange />
      </div>
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
