import { useCallback, useMemo } from "react";
import { ConfigMultiToggle } from "@/components/config/WidgetConfig";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { TeamLogo } from "@/widgets/sports/components/TeamLogo";
import { fetchTeams, type TeamOption } from "@/widgets/sports/lib/espn";
import { leagueById } from "@/widgets/sports/lib/leagues";
import { MAX_TEAMS, useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

const TEAMS_REFRESH_MS = 24 * 60 * 60 * 1000;
const EMPTY_TEAMS: TeamOption[] = [];

export function TeamPicker() {
  const instanceId = useWidgetInstanceId();
  const leagueId = useSports((d) => d.leagueId);
  const teams = useSports((d) => d.teams);
  const setTeams = useSportsStore((s) => s.setTeams);
  const league = leagueById(leagueId);

  const fetcher = useCallback(
    (signal: AbortSignal) => fetchTeams(league?.path ?? "", signal),
    [league?.path],
  );

  const { state } = usePolledResource(fetcher, {
    enabled: Boolean(league),
    intervalMs: TEAMS_REFRESH_MS,
    cacheKey: `sports:teams:${leagueId}`,
    persist: true,
  });

  const available = state.status === "success" ? state.data : EMPTY_TEAMS;

  const options = useMemo(
    () =>
      available.map((team) => ({
        value: team.abbreviation,
        label: team.abbreviation,
        icon: team.logo
          ? ({ className }: { className?: string }) => (
              <TeamLogo src={team.logo} className={className} />
            )
          : undefined,
      })),
    [available],
  );

  if (state.status !== "success") {
    return (
      <span className="text-ink-3 text-caption">
        {state.status === "error" ? "Couldn’t load teams." : "Loading teams…"}
      </span>
    );
  }

  return (
    <ConfigMultiToggle
      label="Teams"
      values={teams}
      options={options}
      maxSelected={MAX_TEAMS}
      onChange={(values) => setTeams(instanceId, values)}
    />
  );
}
