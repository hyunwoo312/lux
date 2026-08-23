import { CalendarRange, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RetryButton, StateMessage } from "@/components/StateMessage";
import { useNow } from "@/hooks/useNow";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { MatchList } from "@/widgets/sports/components/match/MatchList";
import { UnverifiedNotice } from "@/widgets/sports/components/UnverifiedNotice";
import { useLeagueScoreboard } from "@/widgets/sports/hooks/useScoreboard";
import type { League } from "@/widgets/sports/lib/leagues";
import { offseasonStart } from "@/widgets/sports/lib/status";
import { useFollowing, useSports, useSportsStore } from "@/widgets/sports/useSportsStore";
import type { Match } from "@/widgets/sports/types";

const SEASON_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

export function MatchesView({ league }: { league: League }) {
  const instanceId = useWidgetInstanceId();
  const dayWindow = useSports((d) => d.window);
  const setWindow = useSportsStore((s) => s.setWindow);
  const states = useSports((d) => d.states);
  const following = useFollowing(league.id);
  const { state, refresh, isRefreshing } = useLeagueScoreboard(league, dayWindow);
  const now = useNow(30_000).getTime();
  const clock24h = useAppSettingsStore((s) => s.clock24h);

  if (state.status === "loading") return <StateMessage message="Loading scores…" />;

  if (state.status === "error") {
    return (
      <StateMessage
        icon={Trophy}
        message="Scores are unavailable right now."
        action={<RetryButton onRetry={refresh} retrying={isRefreshing} />}
      />
    );
  }

  const all: Match[] = state.status === "success" ? state.data : [];
  const rows = all.filter((match) => states.includes(match.state));
  const returns = offseasonStart(all, now);

  if (returns) {
    return (
      <StateMessage
        icon={Trophy}
        message={`${league.label} returns ${returns.toLocaleDateString(undefined, SEASON_FORMAT)}.`}
      />
    );
  }

  if (rows.length === 0) {
    return dayWindow === "today" ? (
      <StateMessage
        icon={Trophy}
        message={`No ${league.label} games today.`}
        action={
          <Button variant="outline" onClick={() => setWindow(instanceId, "week")}>
            <CalendarRange />
            Look either side of today
          </Button>
        }
      />
    ) : (
      <StateMessage icon={Trophy} message={`No ${league.label} games in this range.`} />
    );
  }

  return (
    <>
      {league.liveUnverified ? <UnverifiedNotice label={league.label} /> : null}
      <MatchList
        label={`${league.label} games`}
        sport={league.sport}
        matches={rows}
        now={now}
        hour12={!clock24h}
        followed={following.teams}
      />
    </>
  );
}
