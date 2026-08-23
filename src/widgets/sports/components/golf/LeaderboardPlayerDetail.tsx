import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";
import type { LeaderboardPlayer, ScoreCounts } from "@/widgets/sports/lib/golf";

const SCORING: { key: keyof ScoreCounts; label: string }[] = [
  { key: "eagles", label: "Eagle+" },
  { key: "birdies", label: "Birdie" },
  { key: "pars", label: "Par" },
  { key: "bogeys", label: "Bogey" },
  { key: "worse", label: "Double+" },
];

export function LeaderboardPlayerDetail({ player }: { player: LeaderboardPlayer }) {
  const { card, scoring } = player;

  return (
    <div className="border-border/50 mx-2 mt-1 mb-2 flex flex-col gap-2 border-t pt-2">
      {card.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={TYPE.eyebrow}>Rounds</span>
          <div className="flex flex-wrap gap-1">
            {card.map((round) => (
              <span
                key={round.round}
                className="bg-foreground/5 flex items-baseline gap-1 rounded-md px-1.5 py-1"
              >
                <span className="text-ink-4 text-micro">R{round.round}</span>
                <span className="text-ink text-caption font-semibold tabular-nums">
                  {round.toPar}
                </span>
                {round.strokes && (
                  <span className="text-ink-4 text-micro tabular-nums">({round.strokes})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {scoring && (
        <div className="flex flex-col gap-1">
          <span className={TYPE.eyebrow}>Scoring</span>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {SCORING.map(({ key, label }) => (
              <span key={key} className="flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-caption font-semibold tabular-nums",
                    key === "eagles" || key === "birdies" ? "text-primary" : "text-ink",
                  )}
                >
                  {scoring[key]}
                </span>
                <span className="text-ink-4 text-micro">{label}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
