import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ExternalLink } from "lucide-react";
import { listVariants } from "@/lib/motion";
import { IconActionButton } from "@/components/IconActionButton";
import { openUrl } from "@/lib/open-url";
import { cn } from "@/lib/utils";
import { ConfigSelect } from "@/components/config/WidgetConfig";
import { RetryButton, StateMessage } from "@/components/StateMessage";
import { useTennis } from "@/widgets/sports/hooks/useTennis";
import { SPORT_ICON } from "@/widgets/sports/lib/leagues";
import type { League } from "@/widgets/sports/lib/leagues";
import { CollapsibleSection } from "@/widgets/sports/components/SportsSection";
import { TennisMatchCard } from "@/widgets/sports/components/tennis/TennisMatchCard";
import type { TennisMatch } from "@/widgets/sports/lib/tennis";

const PAGE = 12;
const BANDS: { id: string; label: string; state: TennisMatch["state"] }[] = [
  { id: "live", label: "Live", state: "in" },
  { id: "upcoming", label: "Upcoming", state: "pre" },
  { id: "past", label: "Past", state: "post" },
];

export function TennisView({ league }: { league: League }) {
  const { state, refresh, isRefreshing } = useTennis(league);
  const reduced = useReducedMotion() ?? false;
  const [drawId, setDrawId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const Icon = SPORT_ICON[league.sport];

  if (state.status === "loading") return <StateMessage message="Loading the draw…" />;

  if (state.status === "error") {
    return (
      <StateMessage
        icon={Icon}
        message="The draw is unavailable right now."
        action={<RetryButton onRetry={refresh} retrying={isRefreshing} />}
      />
    );
  }

  const event = state.status === "success" ? state.data : null;
  if (!event)
    return <StateMessage icon={Icon} message={`No ${league.label} tournament in play.`} />;

  const draw = event.draws.find((entry) => entry.id === drawId) ?? event.draws[0];
  if (!draw) return <StateMessage icon={Icon} message={`No ${league.label} tournament in play.`} />;

  const bands = BANDS.flatMap(({ id, label, state: band }) => {
    const matches = draw.matches.filter((match) => match.state === band);
    return matches.length > 0 ? [{ id, label, matches }] : [];
  });

  let budget = shown;
  const paged = bands.map((band) => {
    const slice = band.matches.slice(0, Math.max(0, budget));
    budget -= slice.length;
    return { ...band, matches: slice };
  });
  const hidden = draw.matches.length - shown;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2">
        <h3 className="text-ink min-w-0 shrink truncate text-caption font-medium">{event.name}</h3>
        {event.draws.length > 1 ? (
          <ConfigSelect
            label="Draw"
            value={draw.id}
            options={event.draws.map((entry) => ({ value: entry.id, label: entry.label }))}
            onChange={(next) => {
              setDrawId(next);
              setShown(PAGE);
            }}
            triggerClassName="h-6 w-auto shrink-0 text-micro"
            contentClassName="w-auto min-w-[var(--radix-select-trigger-width)] whitespace-nowrap"
          />
        ) : (
          <span className="text-ink-4 text-micro shrink-0 truncate">{draw.label}</span>
        )}
        <span className="flex-1" />
        <span
          className={cn(
            "text-micro shrink-0",
            event.state === "in" ? "text-live font-medium" : "text-ink-4",
          )}
        >
          {event.detail}
        </span>
        {event.link ? (
          <IconActionButton
            icon={ExternalLink}
            label={`Open ${event.name} on ESPN`}
            tooltip="Open on ESPN"
            onClick={() => openUrl(event.link ?? "", "newTab")}
          />
        ) : null}
      </div>

      {(event.venue || event.dates) && (
        <p className="text-ink-4 text-micro truncate px-2">
          {[event.venue, event.dates].filter(Boolean).join(" · ")}
        </p>
      )}

      <motion.div
        variants={listVariants(reduced)}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-2"
      >
        {paged.map((band) => (
          <CollapsibleSection key={band.id} label={band.label} count={band.matches.length}>
            <ul aria-label={`${band.label} — ${draw.label}`} className="flex flex-col gap-0.5 px-1">
              {band.matches.map((match) => (
                <TennisMatchCard key={match.id} match={match} />
              ))}
            </ul>
          </CollapsibleSection>
        ))}
      </motion.div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShown((count) => count + PAGE)}
          className={cn(`
            press focus-ring text-ink-3
            hover:bg-foreground/5 hover:text-ink
            mx-2 cursor-pointer rounded-md py-1 text-caption transition-colors
          `)}
        >
          Show more
        </button>
      )}
    </div>
  );
}
