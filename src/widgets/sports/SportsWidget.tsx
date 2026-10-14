import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { panelVariants } from "@/lib/motion";
import { DiscoverTab } from "@/widgets/sports/components/DiscoverTab";
import { FavoritesTab } from "@/widgets/sports/components/FavoritesTab";
import { useSports } from "@/widgets/sports/useSportsStore";
import { useLayoutEffect, useRef } from "react";
import { useSportsView } from "@/widgets/sports/useSportsViewStore";
import { leagueById } from "@/widgets/sports/lib/leagues";
import { GameView } from "@/widgets/sports/components/match/GameView";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function SportsWidget() {
  const instanceId = useWidgetInstanceId();
  const tab = useSports((d) => d.tab);
  const reduced = useReducedMotion() ?? false;
  const selected = useSportsView((view) => view.selected);
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef(selected);
  useLayoutEffect(() => {
    if (selected)
      Array.from(document.querySelectorAll<HTMLButtonElement>("[data-sports-back]"))
        .find((button) => button.dataset.sportsBack === instanceId)
        ?.focus({ preventScroll: true });
    if (!selected && previous.current) {
      const target = Array.from(
        root.current?.querySelectorAll<HTMLButtonElement>("[data-sports-match]") ?? [],
      ).find((button) => button.dataset.sportsMatch === previous.current?.match.id);
      (target ?? root.current?.querySelector<HTMLButtonElement>("button:not([disabled])"))?.focus({
        preventScroll: true,
      });
      target?.scrollIntoView?.({ block: "nearest" });
    }
    previous.current = selected;
  }, [selected, instanceId]);
  const league = selected ? leagueById(selected.leagueId) : null;

  return (
    <div ref={root} className="h-full min-h-0">
      <div hidden={Boolean(selected)} className="h-full">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            variants={panelVariants(reduced)}
            initial="hidden"
            animate="show"
            exit="exit"
            className="h-full"
          >
            {tab === "favorites" ? <FavoritesTab /> : <DiscoverTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      {selected && league && (
        <GameView
          key={`${league.id}:${selected.match.id}`}
          league={league}
          initial={selected.match}
        />
      )}
    </div>
  );
}
