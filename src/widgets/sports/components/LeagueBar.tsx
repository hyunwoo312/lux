import { motion, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";
import { SPORT_ICON, SPORT_LABEL, type League } from "@/widgets/sports/lib/leagues";
import type { SportsPanel } from "@/widgets/sports/types";

const CRUMB = "press focus-ring text-caption max-w-32 truncate rounded-sm px-1.5 py-1";

export function LeagueBar({
  league,
  panel,
  onOpenSports,
  onOpenLeagues,
}: {
  league: League;
  panel: SportsPanel;
  onOpenSports: () => void;
  onOpenLeagues: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const leaguesOpen = panel === "leagues";
  const Icon = SPORT_ICON[league.sport];

  return (
    <nav aria-label="League" className="flex shrink-0 items-center gap-0.5 px-1">
      <button
        type="button"
        onClick={onOpenSports}
        className={cn(CRUMB, "text-ink-3 hover:text-ink flex cursor-pointer items-center gap-1.5")}
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">{SPORT_LABEL[league.sport]}</span>
      </button>
      <ChevronRight className="text-ink-3 size-3.5 shrink-0" aria-hidden />
      <button
        type="button"
        onClick={onOpenLeagues}
        aria-current="page"
        aria-expanded={leaguesOpen}
        className={cn(CRUMB, "text-ink flex cursor-pointer items-center gap-0.5 font-semibold")}
      >
        <span className="min-w-0 truncate">{league.label}</span>
        <motion.span
          className="flex shrink-0"
          animate={{ rotate: leaguesOpen ? 180 : 0 }}
          transition={{ duration: reduced ? 0 : 0.18, ease: EASE_OUT }}
        >
          <ChevronDown className="text-ink-3 size-3.5" aria-hidden />
        </motion.span>
      </button>
    </nav>
  );
}
