import { useEffect, useMemo } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchContributions,
  parseCachedContributions,
} from "@/widgets/github/lib/api/contributions";
import { ActivityLedger } from "@/widgets/github/components/ActivityLedger";
import { Activity } from "lucide-react";
import { ErrorState, StateMessage } from "@/components/StateMessage";
import { Heatmap, HeatmapLegend } from "@/widgets/github/components/ContributionsChart";
import { ContributionsStats } from "@/widgets/github/components/ContributionsStats";
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
  const { state, isRefreshing, refresh, lastSyncedAt } = usePolledResource(fetchContributions, {
    enabled,
    intervalMs: SLOW_REFRESH_MS,
    cacheKey: CONTRIBUTIONS_CACHE_KEY,
    persist: true,
    parsePersisted: parseCachedContributions,
  });
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
  const metrics = useMemo(() => heatmapMetrics(size.width), [size.width]);
  const shownWeeks = useMemo(
    () => (data ? data.weeks.slice(-metrics.weeks) : []),
    [data, metrics.weeks],
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

  if (state.status === "loading") return <StateMessage message="Loading contributions…" />;
  if (state.status === "error")
    return (
      <ErrorState
        error={state.error}
        service="GitHub"
        subject="contributions"
        onRetry={refresh}
        retrying={isRefreshing}
      />
    );
  if (!data) return <StateMessage icon={Activity} message="No contributions yet." />;

  const todayKey = localDayKey(new Date());
  const shownTotal = metrics.weeks >= data.weeks.length ? data.total : sumCounts(shownWeeks);
  const showLedger =
    size.height >= heatmapHeight(metrics) + LEDGER_MIN && ledgerActivity.length > 0;

  return (
    <div className="flex h-full flex-col gap-3 p-1">
      <ContributionsStats data={data} total={shownTotal} weeks={metrics.weeks} />
      <div ref={ref} className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="shrink-0">
          <Heatmap
            weeks={shownWeeks}
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
    </div>
  );
}
