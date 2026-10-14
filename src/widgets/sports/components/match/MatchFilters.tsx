import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { MATCH_STATES, type Match, type MatchState } from "@/widgets/sports/types";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

const FILTERS: { value: MatchState; label: string }[] = [
  { value: "in", label: "Live" },
  { value: "pre", label: "Upcoming" },
  { value: "post", label: "Final" },
];

export function MatchFilters({ matches }: { matches: Match[] }) {
  const id = useWidgetInstanceId();
  const states = useSports((data) => data.states);
  const setStates = useSportsStore((store) => store.setStates);
  const all = states.length === MATCH_STATES.length;
  const phases = [...new Set(matches.map((match) => match.phase))];
  return (
    <div
      role="group"
      aria-label="Filter games"
      className="flex shrink-0 items-center gap-0.5 px-1 py-1"
    >
      {[{ value: "all", label: "All" }, ...FILTERS].map(({ value, label }) => {
        const active = value === "all" ? all : !all && states.includes(value as MatchState);
        const count =
          value === "all"
            ? matches.length
            : matches.filter((match) => match.state === value).length;
        return (
          <Button
            key={value}
            size="xs"
            variant="ghost"
            aria-pressed={active}
            aria-label={`${label} games (${count})`}
            className={cn("gap-1 px-2", active ? "bg-primary/10 text-primary" : "text-ink-3")}
            onClick={() =>
              setStates(id, value === "all" || active ? [...MATCH_STATES] : [value as MatchState])
            }
          >
            {label}
            <span className="text-micro tabular-nums opacity-65">{count}</span>
          </Button>
        );
      })}
      {phases.length === 1 && phases[0] && (
        <span className="text-ink-3 text-micro ml-auto pr-1">{phases[0]}</span>
      )}
    </div>
  );
}
