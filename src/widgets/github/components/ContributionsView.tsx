import { useEffect, useMemo } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchContributions,
  parseCachedContributions,
} from "@/widgets/github/lib/api/contributions";
import { ActivityLedger } from "@/widgets/github/components/ActivityLedger";
import { GithubNotice } from "@/widgets/github/components/GithubNotice";
import { GithubStaleNotice } from "@/widgets/github/components/GithubStaleNotice";
import { Heatmap, HeatmapLegend } from "@/widgets/github/components/ContributionsChart";
import { Stats } from "@/widgets/github/components/contributions/ContributionsStats";
import { heatmapHeight, heatmapMetrics, localDayKey } from "@/widgets/github/lib/heatmap";
import { visibleItems } from "@/widgets/github/lib/visibility";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";
import { useGithubSync } from "@/widgets/github/useGithubSync";
import {
  CONTRIBUTIONS_CACHE_KEY,
  SLOW_REFRESH_MS,
  type ContributionDay,
} from "@/widgets/github/types";

const LEDGER_MIN = 72;

function sumCounts(weeks: ContributionDay[][]): number {
  return weeks.reduce((total, week) => week.reduce((inner, day) => inner + day.count, total), 0);
}

export function ContributionsView({ enabled }: { enabled: boolean }) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const setLogin = useGithubStore((s) => s.setLogin);
  const showPrivate = useGithub((d) => d.showPrivate);
  const newTab = useGithub((d) => d.openBehavior === "newTab");
  const { state, freshness, isRefreshing, refresh, lastSyncedAt } = usePolledResource(
    fetchContributions,
    {
      enabled,
      intervalMs: SLOW_REFRESH_MS,
      cacheKey: CONTRIBUTIONS_CACHE_KEY,
      persist: true,
      parsePersisted: parseCachedContributions,
    },
  );
  useGithubSync(refresh, isRefreshing, lastSyncedAt);

  const data = state.status === "success" ? state.data : null;
  const login = data?.login;
  useEffect(() => {
    if (login) setLogin(login);
  }, [login, setLogin]);

  const ledgerActivity = useMemo(
    () => visibleItems(data?.activity ?? [], showPrivate),
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

  if (state.status === "loading") return <GithubNotice>Loading contributions…</GithubNotice>;
  if (state.status === "error")
    return (
      <GithubNotice error={state.error} fallback="Couldn’t load contributions." onRetry={refresh} />
    );
  if (!data) return <GithubNotice>No contributions yet.</GithubNotice>;

  const metrics = heatmapMetrics(size.width);
  const todayKey = localDayKey(new Date());
  const shownWeeks = data.weeks.slice(-metrics.weeks);
  const shownTotal = metrics.weeks >= data.weeks.length ? data.total : sumCounts(shownWeeks);
  const showLedger =
    size.height >= heatmapHeight(metrics) + LEDGER_MIN && ledgerActivity.length > 0;

  return (
    <div className="flex h-full flex-col gap-3 p-1">
      <Stats data={data} total={shownTotal} weeks={metrics.weeks} />
      <div ref={ref} className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="shrink-0">
          <Heatmap
            weeks={data.weeks}
            metrics={metrics}
            total={shownTotal}
            todayKey={todayKey}
            login={data.login}
            newTab={newTab}
          />
          <HeatmapLegend metrics={metrics} />
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
      <GithubStaleNotice freshness={freshness} />
    </div>
  );
}
