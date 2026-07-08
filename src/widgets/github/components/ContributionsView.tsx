import { useEffect, useMemo } from "react";
import { loadErrorMessage } from "@/lib/rate-limit";
import { useElementSize } from "@/hooks/useElementSize";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchContributions } from "@/widgets/github/lib/github-api";
import { ActivityLedger } from "@/widgets/github/components/ActivityLedger";
import { GithubPlaceholder } from "@/widgets/github/components/GithubPlaceholder";
import {
  GRID_H,
  Heatmap,
  MONTH_ROW_H,
  Stats,
} from "@/widgets/github/components/ContributionsChart";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";
import { useGithubSync } from "@/widgets/github/useGithubSync";

const REFRESH_MS = 30 * 60 * 1000;
const LEDGER_MIN = 72;

export function ContributionsView({ enabled }: { enabled: boolean }) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const persisted = useGithubStore((s) => s.contributions);
  const setContributions = useGithubStore((s) => s.setContributions);
  const showPrivate = useGithub((d) => d.showPrivate);
  const newTab = useGithub((d) => d.openBehavior === "newTab");
  const { state, isRefreshing, refresh, lastSyncedAt } = usePolledResource(fetchContributions, {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: "github:contributions",
  });
  useGithubSync(refresh, isRefreshing, lastSyncedAt);

  const liveData = state.status === "success" ? state.data : null;
  useEffect(() => {
    if (liveData) setContributions(liveData);
  }, [liveData, setContributions]);

  const data = liveData ?? (state.status === "empty" ? null : persisted);
  const ledgerActivity = useMemo(
    () => (data?.activity ?? []).filter((entry) => showPrivate || !entry.isPrivate),
    [data?.activity, showPrivate],
  );
  const ledgerTotals = useMemo(() => {
    if (showPrivate) return data?.totals;
    return ledgerActivity.reduce(
      (acc, entry) => ({
        commits: acc.commits + entry.commits,
        prs: acc.prs + entry.prs,
        issues: acc.issues + entry.issues,
        reviews: acc.reviews + entry.reviews,
      }),
      { commits: 0, prs: 0, issues: 0, reviews: 0 },
    );
  }, [showPrivate, data?.totals, ledgerActivity]);

  if (state.status === "empty" && !liveData)
    return <GithubPlaceholder>No contributions yet.</GithubPlaceholder>;

  if (!data) {
    return state.status === "error" ? (
      <GithubPlaceholder>
        {loadErrorMessage(state.error, "Couldn’t load contributions.")}
      </GithubPlaceholder>
    ) : (
      <GithubPlaceholder>Loading contributions…</GithubPlaceholder>
    );
  }

  const showLedger = size.height >= GRID_H + MONTH_ROW_H + LEDGER_MIN && ledgerActivity.length > 0;

  return (
    <div className="flex h-full flex-col gap-3 p-1">
      <Stats data={data} />
      <div ref={ref} className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="shrink-0">
          <Heatmap weeks={data.weeks} size={size} />
        </div>
        {showLedger && (
          <div className="border-border/50 min-h-0 flex-1 border-t pt-2">
            <ActivityLedger
              activity={ledgerActivity}
              totals={ledgerTotals}
              login={data.login}
              newTab={newTab}
            />
          </div>
        )}
      </div>
    </div>
  );
}
