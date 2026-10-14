import { ArrowLeft } from "lucide-react";
import { ExpandingSearch } from "@/components/ExpandingSearch";
import { Button } from "@/components/ui/button";
import { SportsTabs } from "@/widgets/sports/components/SportsTabs";
import { LEAGUES } from "@/widgets/sports/lib/leagues";
import { useSportsView, useSportsViewStore } from "@/widgets/sports/useSportsViewStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function SportsHeader() {
  const id = useWidgetInstanceId();
  const query = useSportsView((view) => view.query);
  const searchOpen = useSportsView((view) => view.searchOpen);
  const selected = useSportsView((view) => view.selected);
  const setView = useSportsViewStore((store) => store.setView);
  const open = searchOpen || Boolean(query);
  if (selected)
    return (
      <Button
        variant="ghost"
        size="xs"
        aria-label="Back to scores"
        data-sports-back={id}
        onClick={() => setView(id, { selected: null })}
      >
        <ArrowLeft />
        {LEAGUES.find((league) => league.id === selected.leagueId)?.label} scores
      </Button>
    );
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <ExpandingSearch
        className={open ? "min-w-0 flex-1" : "w-7 shrink-0"}
        open={open}
        onOpenChange={(searchOpen) => setView(id, { searchOpen, panel: null })}
        value={query}
        onValueChange={(query) => setView(id, { query, panel: null })}
        ariaLabel="Search sports teams"
        placeholder="Find a team…"
        inputRole="searchbox"
      />
      {!open && <SportsTabs />}
    </div>
  );
}
