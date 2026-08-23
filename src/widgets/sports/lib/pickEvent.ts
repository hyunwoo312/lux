import type { MatchState } from "@/widgets/sports/types";

export type DatedEvent = { state: MatchState; startsAt?: string | undefined };

const PRIORITY: Record<MatchState, number> = { in: 0, pre: 1, post: 2 };

function time(event: DatedEvent): number {
  const parsed = event.startsAt ? Date.parse(event.startsAt) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function pickEventIndex(events: readonly DatedEvent[]): number {
  let best = -1;
  events.forEach((event, index) => {
    if (best === -1) {
      best = index;
      return;
    }
    const chosen = events[best];
    if (!chosen) return;
    const byState = PRIORITY[event.state] - PRIORITY[chosen.state];
    if (byState < 0) {
      best = index;
      return;
    }
    if (byState > 0) return;
    const earlierWins = event.state !== "post";
    const difference = time(event) - time(chosen);
    if (earlierWins ? difference < 0 : difference > 0) best = index;
  });
  return best;
}
