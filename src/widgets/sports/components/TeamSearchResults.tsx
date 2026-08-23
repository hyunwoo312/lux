import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamLogo } from "@/widgets/sports/components/TeamLogo";
import { useTeamIndex } from "@/widgets/sports/hooks/useTeamIndex";
import { leagueById, SPORT_ICON, SPORT_LABEL, type League } from "@/widgets/sports/lib/leagues";
import { searchTeamIndex, searchTours } from "@/widgets/sports/lib/teamIndex";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { MAX_TEAMS, useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

const MAX_RESULTS = 12;

export function TeamSearchResults({ query }: { query: string }) {
  const instanceId = useWidgetInstanceId();
  const following = useSports((d) => d.following);
  const toggleTeam = useSportsStore((s) => s.toggleTeam);
  const { state } = useTeamIndex(query.trim().length > 0);

  if (state.status === "loading") {
    return <Note>Searching teams…</Note>;
  }
  if (state.status === "error") {
    return <Note>Couldn’t load teams to search.</Note>;
  }

  const teams = state.status === "success" ? state.data : [];
  const tours = searchTours(query);
  const results = searchTeamIndex(teams, query, Math.max(0, MAX_RESULTS - tours.length));

  if (results.length === 0 && tours.length === 0) {
    return <Note>Nothing matches “{query.trim()}”.</Note>;
  }

  return (
    <ul className="scroll-fade flex max-h-48 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-1">
      {tours.map((tour) => (
        <TourRow key={tour.id} tour={tour} followed={following[tour.id]?.tour === true} />
      ))}
      {results.map((team) => {
        const league = leagueById(team.leagueId);
        const followed = following[team.leagueId]?.teams ?? [];
        const isFollowed = followed.includes(team.abbreviation);
        const full = followed.length >= MAX_TEAMS;
        return (
          <li key={`${team.leagueId}-${team.abbreviation}`}>
            <button
              type="button"
              aria-pressed={isFollowed}
              disabled={!isFollowed && full}
              onClick={() => toggleTeam(instanceId, team.leagueId, team.abbreviation)}
              className="
                press-row focus-ring
                hover:bg-accent
                text-caption flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-2
                py-2 text-left transition-colors
                disabled:cursor-not-allowed disabled:opacity-40
              "
            >
              <TeamLogo src={team.logo} className="size-4 shrink-0" />
              <span className="text-ink min-w-0 flex-1 truncate">{team.name}</span>
              <span className="text-ink-4 text-micro shrink-0">{league?.label ?? ""}</span>
              <Star
                aria-hidden
                className={cn(
                  "size-3.5 shrink-0",
                  isFollowed ? "text-primary fill-current" : "text-ink-4",
                )}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function TourRow({ tour, followed }: { tour: League; followed: boolean }) {
  const instanceId = useWidgetInstanceId();
  const toggleTour = useSportsStore((s) => s.toggleTour);
  const Icon = SPORT_ICON[tour.sport];

  return (
    <li>
      <button
        type="button"
        aria-pressed={followed}
        aria-label={followed ? `Unfollow ${tour.label}` : `Follow ${tour.label}`}
        onClick={() => toggleTour(instanceId, tour.id)}
        className="
          press-row focus-ring
          hover:bg-accent
          text-caption flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-2 py-2
          text-left transition-colors
        "
      >
        <Icon className="text-ink-3 size-4 shrink-0" />
        <span className="text-ink min-w-0 flex-1 truncate">{tour.label}</span>
        <span className="text-ink-4 text-micro shrink-0">{SPORT_LABEL[tour.sport]}</span>
        <Star
          aria-hidden
          className={cn("size-3.5 shrink-0", followed ? "text-primary fill-current" : "text-ink-4")}
        />
      </button>
    </li>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-ink-4 text-caption px-2 py-1.5">{children}</p>;
}
