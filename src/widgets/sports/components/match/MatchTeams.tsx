import { motion, useReducedMotion } from "motion/react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { enterTween } from "@/lib/motion";
import { TeamLogo } from "@/widgets/sports/components/TeamLogo";
import { useChangeFlash } from "@/widgets/sports/hooks/useChangeFlash";
import type { Match, MatchTeam } from "@/widgets/sports/types";
import { Button } from "@/components/ui/button";

type FollowAction = { toggle: (team: string) => void; canAdd: boolean };

function TeamScore({
  team,
  decided,
  live,
  followed,
  followAction,
}: {
  team: MatchTeam;
  decided: boolean;
  live: boolean;
  followed: boolean;
  followAction?: FollowAction;
}) {
  const changed = useChangeFlash(team.score, live);
  const reduced = useReducedMotion() ?? false;
  const dim = decided && !team.winner;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TeamLogo src={team.logo} className="size-4 shrink-0" />
      <span
        className={cn(
          "text-caption min-w-0 flex-1 font-medium",
          followAction ? "break-words" : "truncate",
          dim ? "text-ink-3" : "text-ink",
        )}
        title={team.name}
      >
        {followAction ? (team.fullName ?? team.name) : team.name}
        <span className="sr-only">{team.abbreviation}</span>
      </span>
      {followAction ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`${followed ? "Unfollow" : "Follow"} ${team.fullName ?? team.name}`}
          aria-pressed={followed}
          title={
            !followed && !followAction.canAdd ? "Follow up to five teams per league" : undefined
          }
          disabled={!followed && !followAction.canAdd}
          onClick={() => followAction.toggle(team.abbreviation)}
        >
          <Star className={cn("size-3.5", followed ? "text-primary fill-current" : "text-ink-3")} />
        </Button>
      ) : (
        followed && (
          <Star
            aria-label="Followed team"
            className="text-primary size-2.5 shrink-0 fill-current"
          />
        )
      )}
      <motion.span
        animate={changed && !reduced ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={enterTween(reduced, "slow")}
        className={cn(
          `
            text-body w-8 shrink-0 rounded-xs text-right font-semibold tabular-nums
            transition-colors
          `,
          dim ? "text-ink-3" : "text-ink",
          changed && "bg-primary/15 text-primary",
        )}
      >
        {team.score ?? "—"}
      </motion.span>
    </span>
  );
}

export function MatchTeams({
  match,
  followed = [],
  followAction,
}: {
  match: Match;
  followed?: readonly string[];
  followAction?: FollowAction;
}) {
  const decided = match.state === "post" && (match.home.winner || match.away.winner);
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
      {[match.away, match.home].map((team, index) => (
        <TeamScore
          key={`${team.abbreviation}:${index}`}
          team={team}
          decided={decided}
          live={match.state === "in"}
          followed={followed.includes(team.abbreviation)}
          followAction={followAction}
        />
      ))}
    </span>
  );
}
