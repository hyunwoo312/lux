import { ExternalLink } from "lucide-react";
import { openUrl } from "@/lib/open-url";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import type { TennisMatch, TennisPlayer } from "@/widgets/sports/lib/tennis";

function SetTable({ match }: { match: TennisMatch }) {
  const count = Math.max(match.home.sets.length, match.away.sets.length);
  if (count === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-ink-3 text-micro flex items-center gap-1 pl-30">
        {Array.from({ length: count }, (_, index) => (
          <span key={index} className="w-5 text-center tabular-nums">
            {index + 1}
          </span>
        ))}
      </div>
      <SetRow player={match.home} count={count} />
      <SetRow player={match.away} count={count} />
    </div>
  );
}

function SetRow({ player, count }: { player: TennisPlayer; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          "w-29 shrink-0 truncate text-micro",
          player.winner ? "text-ink font-semibold" : "text-ink-3",
        )}
      >
        {player.name}
      </span>
      {Array.from({ length: count }, (_, index) => {
        const set = player.sets[index];
        return (
          <span
            key={index}
            className={cn(
              "relative w-5 text-center text-micro tabular-nums",
              set?.won ? "text-ink font-semibold" : "text-ink-3",
            )}
          >
            {set?.games ?? "–"}
            {set?.tiebreak !== undefined && (
              <span className="text-ink-3 absolute -top-1 -right-0.5 text-[0.5rem] leading-none">
                <span className="sr-only">tiebreak {set.tiebreak}</span>
                <span aria-hidden="true">{set.tiebreak}</span>
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn(TYPE.eyebrow, "shrink-0")}>{label}</span>
      <span className="text-ink-2 min-w-0 flex-1 truncate text-right text-micro">{value}</span>
    </div>
  );
}

function PlayerLink({ player }: { player: TennisPlayer }) {
  if (!player.link) return null;

  return (
    <button
      type="button"
      onClick={() => openUrl(player.link ?? "", "newTab")}
      className="
        press focus-ring text-ink-3
        hover:text-primary
        flex cursor-pointer items-center gap-1 rounded-sm text-micro transition-colors
      "
    >
      {player.name}
      <ExternalLink className="size-2.5" aria-hidden />
    </button>
  );
}

export function TennisMatchDetail({ match }: { match: TennisMatch }) {
  const place = [match.court, match.venue].filter(Boolean).join(" · ");
  const links = [match.home, match.away].filter((player) => player.link);

  return (
    <div className="border-border/50 mx-2 mt-1 mb-2 flex flex-col gap-2 border-t pt-2">
      {match.summary ? (
        <p className="text-ink-3 text-micro leading-relaxed">{match.summary}</p>
      ) : null}

      <SetTable match={match} />

      <div className="flex flex-col gap-1">
        {match.bestOf ? <Meta label="Format" value={`Best of ${match.bestOf}`} /> : null}
        {place ? <Meta label="Court" value={place} /> : null}
        {match.broadcast ? <Meta label="Watch" value={match.broadcast} /> : null}
      </div>

      {links.length > 0 && (
        <div className="border-border/50 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2">
          <span className={cn(TYPE.eyebrow, "shrink-0")}>Players</span>
          {links.map((player) => (
            <PlayerLink key={player.name} player={player} />
          ))}
        </div>
      )}
    </div>
  );
}
