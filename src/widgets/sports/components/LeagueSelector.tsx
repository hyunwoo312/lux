import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";
import { ROW } from "@/lib/row";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import {
  activeSports,
  leagueById,
  leaguesBySport,
  SPORT_ICON,
  SPORT_LABEL,
  type Sport,
} from "@/widgets/sports/lib/leagues";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

const SLIDE = 16;

export function LeagueSelector({
  sport,
  onSport,
  onPick,
}: {
  sport: Sport | null;
  onSport: (sport: Sport | null) => void;
  onPick?: () => void;
}) {
  const instanceId = useWidgetInstanceId();
  const leagueId = useSports((d) => d.leagueId);
  const setLeague = useSportsStore((s) => s.setLeague);
  const reduced = useReducedMotion() ?? false;
  const current = leagueById(leagueId);

  const offset = reduced ? 0 : SLIDE;
  const transition = { duration: reduced ? 0 : 0.18, ease: EASE_OUT };

  return (
    <div className="relative shrink-0 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {sport === null ? (
          <motion.div
            key="sports"
            initial={{ opacity: 0, x: -offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -offset }}
            transition={transition}
            className="flex flex-col gap-0.5 px-1"
          >
            {activeSports().map((entry) => {
              const Icon = SPORT_ICON[entry];
              const leagues = leaguesBySport(entry);
              const holdsCurrent = current?.sport === entry;
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => onSport(entry)}
                  aria-label={`${SPORT_LABEL[entry]} leagues`}
                  className={cn(ROW.option, "gap-2.5 py-2", holdsCurrent && "text-primary")}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-left">{SPORT_LABEL[entry]}</span>
                  <span className="text-ink-4 text-micro shrink-0 tabular-nums">
                    {leagues.length}
                  </span>
                  <ChevronRight className="text-ink-4 size-3 shrink-0" aria-hidden />
                </button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key={sport}
            initial={{ opacity: 0, x: offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: offset }}
            transition={transition}
            className="flex flex-col gap-0.5 px-1"
          >
            <button
              type="button"
              onClick={() => onSport(null)}
              aria-label="Back to sports"
              className={cn(ROW.option, "text-ink-3 gap-2.5 py-2")}
            >
              <ChevronLeft className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-left font-medium">
                {SPORT_LABEL[sport]}
              </span>
            </button>
            {leaguesBySport(sport).map((league) => {
              const selected = league.id === leagueId;
              return (
                <button
                  key={league.id}
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => {
                    setLeague(instanceId, league.id);
                    onPick?.();
                  }}
                  className={cn(
                    ROW.option,
                    "gap-2.5 py-2 pl-8",
                    selected ? "text-primary font-medium" : "text-ink",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-left">{league.label}</span>
                  {selected && (
                    <span aria-hidden className="bg-primary size-1.5 shrink-0 rounded-full" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
