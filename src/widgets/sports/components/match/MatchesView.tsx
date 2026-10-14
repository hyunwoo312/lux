import { CalendarRange, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, StateMessage } from "@/components/StateMessage";
import { useNow } from "@/hooks/useNow";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { MatchList } from "@/widgets/sports/components/match/MatchList";
import { useLeagueScoreboard } from "@/widgets/sports/hooks/useScoreboard";
import type { League } from "@/widgets/sports/lib/leagues";
import { offseasonStart } from "@/widgets/sports/lib/status";
import { useFollowing, useSports, useSportsStore } from "@/widgets/sports/useSportsStore";
import type { Match } from "@/widgets/sports/types";
import { MatchFilters } from "@/widgets/sports/components/match/MatchFilters";
import { MATCH_STATES } from "@/widgets/sports/types";
import { useSportsView } from "@/widgets/sports/useSportsViewStore";

const SEASON_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

export function MatchesView({ league }: { league: League }) {
  const instanceId = useWidgetInstanceId();
  const dayWindow = useSports((d) => d.window);
  const setWindow = useSportsStore((s) => s.setWindow);
  const states = useSports((d) => d.states);
  const following = useFollowing(league.id);
  const { state, refresh, isRefreshing, missingDays = [] } = useLeagueScoreboard(league, dayWindow);
  const selectedDate = useSportsView((view) => view.date);
  const now = useNow(30_000).getTime();
  const clock24h = useAppSettingsStore((s) => s.clock24h);

  if (state.status === "loading") return <StateMessage message="Loading scores…" />;

  if (state.status === "error") {
    return (
      <ErrorState
        error={state.error}
        service="ESPN"
        subject="scores"
        onRetry={refresh}
        retrying={isRefreshing}
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
    if (all.length > 0)
      return (
        <div className="flex h-full min-h-0 flex-col">
          <MatchFilters matches={all} />
          <StateMessage
            icon={Trophy}
            message="No games match this filter."
            action={
              <Button
                variant="ghost"
                size="xs"
                onClick={() => useSportsStore.getState().setStates(instanceId, [...MATCH_STATES])}
              >
                Show all games
              </Button>
            }
          />
        </div>
      );
    if (missingDays.length > 0)
      return (
        <StateMessage
          icon={Trophy}
          message="Some dates could not be loaded."
          action={
            <Button variant="ghost" size="xs" onClick={refresh}>
              Retry scores
            </Button>
          }
        />
      );
    return dayWindow === "today" ? (
      <StateMessage
        icon={Trophy}
        message={
          selectedDate
            ? `No ${league.label} games on this date.`
            : `No ${league.label} games today.`
        }
        action={
          <Button variant="outline" onClick={() => setWindow(instanceId, "week")}>
            <CalendarRange />
            Look either side of this date
          </Button>
        }
      />
    ) : (
      <StateMessage icon={Trophy} message={`No ${league.label} games in this range.`} />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MatchFilters matches={all} />
      {missingDays.length > 0 && (
        <p className="text-ink-3 text-micro px-2 pb-2">
          Some dates are unavailable. Results may be incomplete.
        </p>
      )}
      <div className="scroll-fade min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1">
        <MatchList
          label={`${league.label} games`}
          sport={league.sport}
          leagueId={league.id}
          matches={rows}
          now={now}
          hour12={!clock24h}
          followed={following.teams}
        />
      </div>
    </div>
  );
}
