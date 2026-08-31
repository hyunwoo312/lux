import { Star, Trophy } from "lucide-react";
import { matchesQuery, openResult } from "@/widgets/core/commandResult";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { matchStatus } from "@/widgets/sports/lib/status";
import { instanceData, instanceIds } from "@/widgets/core/instances";
import { needsWidget } from "@/widgets/core/commandSetup";
import type { CommandResult, LabelSegment, WidgetCommand } from "@/widgets/core/types";
import { readPolled } from "@/widgets/core/usePolledResource";
import { leagueById, SPORT_ICON, type League } from "@/widgets/sports/lib/leagues";
import { sportsScoreboard, sportsTeamIndex } from "@/widgets/sports/lib/resources";
import { searchTeamIndex, type IndexedTeam } from "@/widgets/sports/lib/teamIndex";
import type { DayWindow } from "@/widgets/sports/lib/window";
import { DEFAULT_DATA, useSportsStore } from "@/widgets/sports/useSportsStore";
import { STATE_ORDER, type Match, type MatchState } from "@/widgets/sports/types";

const LEAGUE_LIMIT = 5;

const TEAM_LIMIT = 20;

const MATCH_LIMIT = 40;

const STATE_SECTION: Record<MatchState, string> = {
  in: "Live",
  pre: "Upcoming",
  post: "Final",
};

function followedLeagues(): { league: League; dayWindow: DayWindow }[] {
  const seen = new Map<string, DayWindow>();

  for (const { data } of instanceData(
    "sports",
    useSportsStore.getState().byInstance,
    DEFAULT_DATA,
  )) {
    const ids = [
      data.leagueId,
      ...Object.entries(data.following)
        .filter(([, following]) => following.teams.length > 0 || following.tour)
        .map(([leagueId]) => leagueId),
    ];
    for (const id of ids) if (!seen.has(id)) seen.set(id, data.window);
  }

  return [...seen.entries()]
    .flatMap(([id, dayWindow]) => {
      const league = leagueById(id);
      return league ? [{ league, dayWindow }] : [];
    })
    .slice(0, LEAGUE_LIMIT);
}

function scoreLine(match: Match): string {
  const { away, home } = match;
  return match.state === "pre"
    ? `${away.name} at ${home.name}`
    : `${away.name} ${away.score ?? 0} – ${home.score ?? 0} ${home.name}`;
}

function scoreSegments(match: Match): LabelSegment[] {
  const { away, home } = match;
  const middle = match.state === "pre" ? "at" : `${away.score ?? 0} – ${home.score ?? 0}`;
  return [
    ...(away.logo ? [{ image: away.logo }] : []),
    { text: away.name },
    { text: middle },
    ...(home.logo ? [{ image: home.logo }] : []),
    { text: home.name },
  ];
}

function matchRow(match: Match, league: League, link: string): CommandResult {
  return {
    id: `sports.match.${match.id}`,
    label: scoreLine(match),
    detail: league.label,
    meta: matchStatus(match, Date.now(), !useAppSettingsStore.getState().clock24h),
    section: STATE_SECTION[match.state],
    icon: SPORT_ICON[league.sport],
    labelSegments: scoreSegments(match),
    run: () => openResult(link),
  };
}

function teamRow(team: IndexedTeam, instanceId: string): CommandResult {
  const following = useSportsStore.getState().byInstance[instanceId]?.following[team.leagueId];
  const isFollowed = following?.teams.includes(team.abbreviation) ?? false;
  return {
    id: `sports.team.${team.leagueId}.${team.abbreviation}`,
    label: team.name,
    detail: leagueById(team.leagueId)?.label,
    section: "Teams",
    meta: isFollowed ? "Following" : undefined,
    icon: Star,
    artworkUrl: team.logo,
    run: () => useSportsStore.getState().toggleTeam(instanceId, team.leagueId, team.abbreviation),
  };
}

const scores: WidgetCommand = {
  kind: "provider",
  id: "sports.scores",
  label: "Scores",
  description: "Live scores and fixtures from the leagues you follow",
  icon: Trophy,
  keywords: ["game", "match", "fixture", "result", "live", "score"],
  placeholder: "Search scores",
  emptyMessage: (query) =>
    query === "" ? "Nothing scheduled in the leagues you follow." : `No game matched “${query}”.`,
  search: async (query) => {
    const needle = query.trim();
    const loaded = await Promise.all(
      followedLeagues().map(async ({ league, dayWindow }) => {
        const matches = await readPolled(sportsScoreboard(league, dayWindow)).catch(
          (): Match[] => [],
        );
        return matches.flatMap((match) =>
          match.link ? [{ match, league, link: match.link }] : [],
        );
      }),
    );
    return loaded
      .flat()
      .filter(({ match, league }) => matchesQuery(`${scoreLine(match)} ${league.label}`, needle))
      .sort((a, b) => STATE_ORDER[a.match.state] - STATE_ORDER[b.match.state])
      .slice(0, MATCH_LIMIT)
      .map(({ match, league, link }) => matchRow(match, league, link));
  },
};

function followTeamCommand(instanceId: string): WidgetCommand {
  return {
    kind: "provider",
    id: "sports.followTeam",
    label: "Follow a team",
    description: "Add a team to your Sports widget, or stop following it",
    icon: Star,
    keywords: ["team", "favourite", "favorite", "track", "unfollow"],
    placeholder: "Search teams",
    emptyMessage: (query) =>
      query === "" ? "Type a team name to follow it." : `No team matched “${query}”.`,
    search: async (query) => {
      const needle = query.trim();
      if (needle === "") return [];
      const teams = await readPolled(sportsTeamIndex);
      return searchTeamIndex(teams, needle, TEAM_LIMIT).map((team) => teamRow(team, instanceId));
    },
  };
}

const sportsWidget = () => needsWidget("sports", "Sports");

export const sportsCommands = (): WidgetCommand[] => {
  const [instanceId] = instanceIds("sports");
  return [scores, followTeamCommand(instanceId ?? "")].map((command) => ({
    ...command,
    setup: sportsWidget,
  }));
};
