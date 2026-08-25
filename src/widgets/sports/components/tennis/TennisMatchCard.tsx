import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { LiveIndicator } from "@/widgets/sports/components/LiveIndicator";
import { TennisMatchDetail } from "@/widgets/sports/components/tennis/TennisMatchDetail";
import { hasTennisDetail } from "@/widgets/sports/lib/tennis";
import type { TennisMatch, TennisPlayer } from "@/widgets/sports/lib/tennis";

function PlayerLine({
  player,
  decided,
  live,
}: {
  player: TennisPlayer;
  decided: boolean;
  live: boolean;
}) {
  const dim = decided && !player.winner;

  return (
    <span className="flex min-w-0 items-center gap-2">
      {player.flag ? (
        <img
          src={player.flag}
          alt=""
          loading="lazy"
          className="size-3 shrink-0 rounded-2xs object-cover"
        />
      ) : (
        <span className="size-3 shrink-0" />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-caption",
          dim ? "text-ink-3" : "text-ink",
          player.winner && "font-semibold",
        )}
      >
        {player.name}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {player.sets.map((set, index) => {
          const current = live && index === player.sets.length - 1;
          return (
            <span
              key={index}
              className={cn(
                "relative w-3.5 text-center text-caption tabular-nums",
                current
                  ? "text-success font-semibold"
                  : set.won
                    ? "text-ink font-semibold"
                    : "text-ink-3",
              )}
            >
              {set.games}
              {set.tiebreak !== undefined && (
                <span className="text-ink-3 absolute -top-0.5 -right-1 text-[0.5rem] leading-none">
                  {set.tiebreak}
                </span>
              )}
            </span>
          );
        })}
      </span>
    </span>
  );
}

export function TennisMatchCard({ match }: { match: TennisMatch }) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const live = match.state === "in";
  const decided = match.state === "post" && (match.home.winner || match.away.winner);
  const expandable = hasTennisDetail(match);

  const body = (
    <>
      <PlayerLine player={match.home} decided={decided} live={live} />
      <PlayerLine player={match.away} decided={decided} live={live} />
      {match.round || match.detail ? (
        <span className="flex items-center gap-1.5">
          {live ? <LiveIndicator /> : null}
          <span
            className={cn(
              "min-w-0 truncate text-micro",
              live ? "text-success font-medium" : "text-ink-3",
            )}
          >
            {[match.round, live || match.state === "pre" ? match.detail : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      ) : null}
    </>
  );

  return (
    <li className="rounded-lg">
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={`${match.home.name} versus ${match.away.name}, show details`}
          onClick={() => setOpen((value) => !value)}
          className="
            press-row focus-ring
            hover:bg-foreground/5
            focus-visible:bg-foreground/5
            flex w-full cursor-pointer flex-col gap-1 rounded-lg px-2 py-2 text-left
            transition-colors
          "
        >
          {body}
        </button>
      ) : (
        <div className="flex flex-col gap-1 px-2 py-2">{body}</div>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={detailId}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
          >
            <TennisMatchDetail match={match} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
