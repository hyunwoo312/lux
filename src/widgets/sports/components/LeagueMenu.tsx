import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EASE_OUT_QUINT } from "@/lib/motion";
import { accentClass } from "@/widgets/core/accent";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { LEAGUES, leagueById } from "@/widgets/sports/lib/leagues";
import { SPORTS_ACCENT } from "@/widgets/sports/types";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

const TRIGGER_CLASS = `
  text-muted-foreground
  hover:text-foreground hover:bg-foreground/5
  focus-visible:text-foreground focus-visible:bg-foreground/5
  data-[state=open]:text-foreground data-[state=open]:bg-foreground/5
  flex min-w-0 shrink items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs outline-none
  transition-colors
`;

export function LeagueMenu() {
  const instanceId = useWidgetInstanceId();
  const leagueId = useSports((d) => d.leagueId);
  const setLeague = useSportsStore((s) => s.setLeague);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const active = leagueById(leagueId) ?? LEAGUES[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content="Change league">
        <PopoverTrigger aria-label="Change league" className={TRIGGER_CLASS}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={leagueId}
              className="truncate"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduced ? 0 : 0.18, ease: EASE_OUT_QUINT }}
            >
              {active?.label}
            </motion.span>
          </AnimatePresence>
          <motion.span
            className="flex shrink-0"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: EASE_OUT_QUINT }}
          >
            <ChevronDown className="size-3" aria-hidden />
          </motion.span>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        align="start"
        className={cn(accentClass(SPORTS_ACCENT), "w-auto min-w-40 p-1")}
      >
        <div className="flex flex-col">
          {LEAGUES.map((league, index) => {
            const selected = league.id === leagueId;
            return (
              <motion.button
                key={league.id}
                type="button"
                onClick={() => {
                  setLeague(instanceId, league.id);
                  setOpen(false);
                }}
                initial={reduced ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reduced ? 0 : 0.16,
                  delay: reduced ? 0 : index * 0.025,
                  ease: EASE_OUT_QUINT,
                }}
                className={cn(
                  `
                    hover:bg-accent
                    flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs
                    transition-colors
                  `,
                  selected ? "text-primary font-medium" : "text-foreground",
                )}
              >
                <span className="flex-1">{league.label}</span>
                <Check
                  className={cn(
                    "text-primary size-3 shrink-0 transition-opacity",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
              </motion.button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
