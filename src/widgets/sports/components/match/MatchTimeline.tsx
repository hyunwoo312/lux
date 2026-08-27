import { cn } from "@/lib/utils";
import type { MatchEvent, MatchEventKind } from "@/widgets/sports/types";

const LABEL: Record<MatchEventKind, string> = {
  goal: "Goal",
  "own-goal": "Own goal",
  penalty: "Penalty scored",
  "penalty-missed": "Penalty missed",
  yellow: "Yellow card",
  red: "Red card",
};

const SUFFIX: Partial<Record<MatchEventKind, string>> = {
  "own-goal": "OG",
  penalty: "P",
  "penalty-missed": "P",
};

function Marker({ kind }: { kind: MatchEventKind }) {
  if (kind === "yellow" || kind === "red") {
    return (
      <span
        aria-hidden
        className={cn(
          "h-3 w-2 shrink-0 rounded-2xs",
          kind === "yellow" ? "bg-yellow-400" : "bg-red-500",
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full",
        kind === "penalty-missed" ? "border-ink-3 border" : "bg-ink",
      )}
    />
  );
}

function Side({ event, side }: { event: MatchEvent; side: "home" | "away" }) {
  if (event.side !== side) return <span className="min-w-0 flex-1" />;

  const away = side === "away";
  const suffix = SUFFIX[event.kind];
  const name = (
    <span className="text-micro text-ink min-w-0 truncate">
      {event.player}
      {suffix ? <span className="text-ink-3"> ({suffix})</span> : null}
    </span>
  );

  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1.5",
        away ? "justify-end" : "justify-start",
      )}
    >
      <span className="sr-only">
        {LABEL[event.kind]}, {event.player},{" "}
      </span>
      {away ? name : <Marker kind={event.kind} />}
      {away ? <Marker kind={event.kind} /> : name}
    </span>
  );
}

export function MatchTimeline({ events }: { events: MatchEvent[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {events.map((event, index) => (
        <li key={`${event.minute}-${event.player}-${index}`} className="flex items-center gap-2">
          <Side event={event} side="away" />
          <span className="text-ink-3 text-micro w-10 shrink-0 text-center tabular-nums">
            {event.minute}
          </span>
          <Side event={event} side="home" />
        </li>
      ))}
    </ul>
  );
}
