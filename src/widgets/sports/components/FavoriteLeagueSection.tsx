import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { MatchList } from "@/widgets/sports/components/match/MatchList";
import { CollapsibleSection } from "@/widgets/sports/components/SportsSection";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";
import { useLeagueScoreboard } from "@/widgets/sports/hooks/useScoreboard";
import { followedView } from "@/widgets/sports/lib/roster";
import { matchesTeam } from "@/widgets/sports/lib/espn";
import type { League } from "@/widgets/sports/lib/leagues";
import type { DayWindow } from "@/widgets/sports/lib/window";
import type { Match } from "@/widgets/sports/types";
import { matchesQuery } from "@/lib/utils";
import { ErrorState, StateMessage } from "@/components/StateMessage";

function teamMatchesQuery(match: Match, abbreviation: string, needle: string): boolean {
  if (matchesQuery(abbreviation, needle)) return true;
  const side = [match.home, match.away].find((team) => team.abbreviation === abbreviation);
  return side ? matchesQuery(side.fullName ?? side.name, needle) : false;
}

export function FavoriteLeagueSection({
  league,
  dayWindow,
  teams,
  query,
  now,
}: {
  league: League;
  dayWindow: DayWindow;
  teams: string[];
  query: string;
  now: number;
}) {
  const instanceId = useWidgetInstanceId();
  const { state, refresh, missingDays = [] } = useLeagueScoreboard(league, dayWindow);
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const open = useSports((d) => !d.collapsed.includes(league.id));
  const states = useSports((d) => d.states);
  const setSectionOpen = useSportsStore((s) => s.setSectionOpen);

  const all: Match[] = state.status === "success" ? state.data : [];
  const needle = query.trim().toLowerCase();
  const shownTeams =
    needle === ""
      ? teams
      : teams.filter((team) =>
          all.some((match) => matchesTeam(match, team) && teamMatchesQuery(match, team, needle))
            ? true
            : matchesQuery(team, needle),
        );

  if (needle !== "" && shownTeams.length === 0) return null;

  const rows = all.filter((match) => states.includes(match.state));
  const { matches, idle } = followedView(rows, all, shownTeams);

  return (
    <CollapsibleSection
      label={league.label}
      count={matches.length}
      tone="league"
      open={open}
      onToggle={(next) => setSectionOpen(instanceId, league.id, next)}
    >
      {state.status === "loading" ? (
        <StateMessage compact message="Loading…" />
      ) : state.status === "error" ? (
        <ErrorState error={state.error} service="ESPN" subject="scores" onRetry={refresh} />
      ) : (
        <>
          <p className="text-ink-3 text-micro px-2">
            {missingDays.length > 0
              ? "Some dates are unavailable. Results may be incomplete."
              : matches.length === 0 &&
                  idle.length === 0 &&
                  all.some((match) => shownTeams.some((team) => matchesTeam(match, team)))
                ? "No games match this filter."
                : ""}
          </p>
          <MatchList
            label={`${league.label} games`}
            sport={league.sport}
            leagueId={league.id}
            matches={matches}
            idle={idle}
            now={now}
            hour12={!clock24h}
            followed={shownTeams}
            indent
          />
        </>
      )}
    </CollapsibleSection>
  );
}
