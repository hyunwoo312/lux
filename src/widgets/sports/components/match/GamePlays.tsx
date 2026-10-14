import { useRef, useState } from "react";
import { ConfigSelect } from "@/components/config/Config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import type { GamePlay, GameSummary } from "@/widgets/sports/types";

function PlayRow({ play }: { play: GamePlay }) {
  return (
    <li
      className={cn(
        "border-border/40 flex flex-col gap-1 border-b px-1 py-2.5",
        play.scoring && "border-l-primary/40 border-l-2 pl-2",
      )}
    >
      <div className="text-ink-3 text-micro flex items-center justify-between gap-2 tabular-nums">
        <span>
          {play.period > 4 ? "OT" : `Q${play.period}`} · {play.clock}
        </span>
        {play.awayScore != null && play.homeScore != null && (
          <span>
            {play.awayScore} – {play.homeScore}
          </span>
        )}
      </div>
      <p className="text-caption leading-relaxed break-words">{play.text}</p>
    </li>
  );
}

export function GamePlays({ summary, football }: { summary: GameSummary; football: boolean }) {
  const [mode, setMode] = useState(football ? "scoring" : "latest");
  const [period, setPeriod] = useState("all");
  const [limit, setLimit] = useState(25);
  const filtered = [...summary.plays]
    .reverse()
    .filter(
      (play) =>
        (mode !== "scoring" || play.scoring) &&
        (period === "all" || String(play.period) === period),
    );
  const [anchor, setAnchor] = useState(filtered[0]?.id ?? "");
  const root = useRef<HTMLDivElement>(null);
  const index = filtered.findIndex((play) => play.id === anchor);
  const newCount = Math.max(0, index);
  const shown = filtered.slice(newCount);
  const periods = [...new Set(summary.plays.map((play) => play.period))].sort((a, b) => a - b);
  const options = [
    { value: "latest", label: "Latest plays" },
    { value: "scoring", label: "Scoring plays" },
    ...(summary.drives.length ? [{ value: "drives", label: "Drives" }] : []),
  ];
  const choose = (nextMode: string, nextPeriod: string) => {
    setMode(nextMode);
    setPeriod(nextPeriod);
    setLimit(25);
    setAnchor(
      [...summary.plays]
        .reverse()
        .find(
          (play) =>
            (nextMode !== "scoring" || play.scoring) &&
            (nextPeriod === "all" || String(play.period) === nextPeriod),
        )?.id ?? "",
    );
  };
  return (
    <div ref={root} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <ConfigSelect
          label="Play view"
          value={mode}
          options={options}
          onChange={(next) => choose(next, period)}
          triggerClassName="min-w-0 flex-1"
          contentClassName="w-44"
        />
        <Tooltip
          content={
            newCount > 0 ? `${newCount} new ${newCount === 1 ? "play" : "plays"}` : "Up to date"
          }
        >
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`${newCount} new ${newCount === 1 ? "play" : "plays"}`}
            aria-hidden={newCount === 0 || mode === "drives"}
            className={cn(
              "relative text-primary",
              (newCount === 0 || mode === "drives") && "invisible",
            )}
            onClick={() => {
              setAnchor(filtered[0]?.id ?? "");
              const scroller = root.current?.closest<HTMLElement>("[data-game-scroll]");
              if (scroller) scroller.scrollTop = 0;
            }}
          >
            <ArrowUp />
            <span className="text-micro absolute -top-0.5 -right-0.5">{newCount}</span>
          </Button>
        </Tooltip>
        <ConfigSelect
          label="Play period"
          value={period}
          options={[
            { value: "all", label: "All periods" },
            ...periods.map((period) => ({
              value: String(period),
              label: period > 4 ? `${period - 4 > 1 ? period - 4 : ""}OT` : `Quarter ${period}`,
            })),
          ]}
          onChange={(next) => choose(mode, next)}
          triggerClassName="w-28"
          contentClassName="w-40"
        />
      </div>
      {mode === "drives" ? (
        <div className="flex flex-col gap-1">
          {[...summary.drives]
            .reverse()
            .filter(
              (drive) =>
                period === "all" || drive.plays.some((play) => String(play.period) === period),
            )
            .map((drive) => (
              <details key={drive.id} className="border-border/40 rounded-md border-b px-1">
                <summary
                  className="
                    focus-ring
                    hover:bg-foreground/5
                    text-caption cursor-pointer rounded-md py-2
                  "
                >
                  <span className="font-medium">{drive.result}</span>
                  <span className="text-ink-3 text-micro ml-2">{drive.description}</span>
                </summary>
                <ul className="px-1">
                  {[...drive.plays].reverse().map((play) => (
                    <PlayRow key={play.id} play={play} />
                  ))}
                </ul>
              </details>
            ))}
        </div>
      ) : (
        <>
          <ul>
            {shown.slice(0, limit).map((play) => (
              <PlayRow key={play.id} play={play} />
            ))}
          </ul>
          {shown.length === 0 && (
            <p className="text-ink-3 text-caption py-4 text-center">No plays match this view.</p>
          )}
          {shown.length > limit && (
            <Button variant="ghost" size="xs" onClick={() => setLimit(limit + 25)}>
              Show more plays
            </Button>
          )}
        </>
      )}
    </div>
  );
}
