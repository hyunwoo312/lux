import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ExternalLink, Flag } from "lucide-react";
import { EASE_OUT, listVariants, rowVariants } from "@/lib/motion";
import { IconActionButton } from "@/components/IconActionButton";
import { openUrl } from "@/lib/open-url";
import { cn } from "@/lib/utils";
import { ErrorState, StateMessage } from "@/components/StateMessage";
import { SectionHeading } from "@/widgets/sports/components/SportsSection";
import { UnverifiedNotice } from "@/widgets/sports/components/UnverifiedNotice";
import { LeaderboardPlayerDetail } from "@/widgets/sports/components/golf/LeaderboardPlayerDetail";
import { useLeaderboard } from "@/widgets/sports/hooks/useLeaderboard";
import { hasPlayerDetail, type LeaderboardPlayer } from "@/widgets/sports/lib/golf";
import type { League } from "@/widgets/sports/lib/leagues";

const PAGE = 20;

export function LeaderboardView({ league }: { league: League }) {
  const { state, refresh, isRefreshing } = useLeaderboard(league);
  const reduced = useReducedMotion() ?? false;
  const [shown, setShown] = useState(PAGE);

  if (state.status === "loading") {
    return <StateMessage message="Loading the leaderboard…" />;
  }

  if (state.status === "error") {
    return (
      <ErrorState
        error={state.error}
        service="ESPN"
        subject="the leaderboard"
        onRetry={refresh}
        retrying={isRefreshing}
      />
    );
  }

  const board = state.status === "success" ? state.data : null;
  if (!board || board.players.length === 0) {
    return <StateMessage icon={Flag} message={`No ${league.label} tournament in play.`} />;
  }

  const players = board.players.slice(0, shown);
  const live = board.state === "in";

  return (
    <div className="flex flex-col gap-1">
      {league.liveUnverified ? <UnverifiedNotice label={league.label} /> : null}

      <div className="flex items-center gap-2 px-2">
        <h3 className="text-ink min-w-0 flex-1 truncate text-caption font-medium">{board.name}</h3>
        {board.dates ? <span className="text-ink-4 text-micro shrink-0">{board.dates}</span> : null}
        <span className={cn("text-micro shrink-0", live ? "text-live font-medium" : "text-ink-4")}>
          {board.detail}
        </span>
        {board.link ? (
          <IconActionButton
            icon={ExternalLink}
            label={`Open ${board.name} on ESPN`}
            tooltip="Open on ESPN"
            onClick={() => openUrl(board.link ?? "", "newTab")}
          />
        ) : null}
      </div>

      <motion.ul
        variants={listVariants(reduced)}
        initial="hidden"
        animate="show"
        aria-label={`${board.name} leaderboard`}
        className="flex flex-col"
      >
        {players.map((player, index) => (
          <PlayerRow
            key={player.id}
            player={player}
            live={live}
            firstOut={!player.madeCut && (players[index - 1]?.madeCut ?? false)}
            reduced={reduced}
          />
        ))}
      </motion.ul>

      {shown < board.players.length && (
        <button
          type="button"
          onClick={() => setShown((count) => count + PAGE)}
          className="
            press focus-ring text-ink-3
            hover:bg-foreground/5 hover:text-ink
            mx-2 cursor-pointer rounded-md py-1 text-caption transition-colors
          "
        >
          Show more
        </button>
      )}
    </div>
  );
}

function PlayerRow({
  player,
  live,
  firstOut,
  reduced,
}: {
  player: LeaderboardPlayer;
  live: boolean;
  firstOut: boolean;
  reduced: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const expandable = hasPlayerDetail(player);

  const body = (
    <>
      <span className="text-ink-4 text-micro w-7 shrink-0 text-right tabular-nums">
        {player.position}
      </span>
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
          player.madeCut ? "text-ink" : "text-ink-4",
        )}
      >
        {player.name}
      </span>
      {live && (
        <span className="text-ink-3 text-micro w-7 shrink-0 text-right tabular-nums">
          {player.today ?? ""}
        </span>
      )}
      <span
        className={cn(
          "w-8 shrink-0 text-right text-caption tabular-nums",
          player.position === "1" ? "text-primary font-semibold" : null,
          player.madeCut && player.position !== "1" ? "text-ink font-semibold" : null,
          !player.madeCut && "text-ink-4",
        )}
      >
        {player.score}
      </span>
    </>
  );

  return (
    <>
      {firstOut && (
        <li aria-hidden>
          <SectionHeading label="Missed the cut" className="pt-2 pb-1" />
        </li>
      )}
      <motion.li variants={rowVariants(reduced)} className="rounded-md">
        {expandable ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={`${player.name}, show round detail`}
            onClick={() => setOpen((value) => !value)}
            className="
              press-row focus-ring
              hover:bg-foreground/5
              focus-visible:bg-foreground/5
              flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left
              transition-colors
            "
          >
            {body}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1.5">{body}</div>
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
              <LeaderboardPlayerDetail player={player} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.li>
    </>
  );
}
