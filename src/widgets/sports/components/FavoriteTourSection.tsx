import { LeaderboardView } from "@/widgets/sports/components/golf/LeaderboardView";
import { CollapsibleSection } from "@/widgets/sports/components/SportsSection";
import { TennisView } from "@/widgets/sports/components/tennis/TennisView";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { League } from "@/widgets/sports/lib/leagues";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

export function FavoriteTourSection({ league, query }: { league: League; query: string }) {
  const instanceId = useWidgetInstanceId();
  const open = useSports((d) => !d.collapsed.includes(league.id));
  const setSectionOpen = useSportsStore((s) => s.setSectionOpen);
  const needle = query.trim().toLowerCase();
  if (needle !== "" && !league.label.toLowerCase().includes(needle)) return null;

  return (
    <CollapsibleSection
      label={league.label}
      tone="league"
      open={open}
      onToggle={(next) => setSectionOpen(instanceId, league.id, next)}
    >
      {league.kind === "draw" ? (
        <TennisView league={league} />
      ) : (
        <LeaderboardView league={league} />
      )}
    </CollapsibleSection>
  );
}
