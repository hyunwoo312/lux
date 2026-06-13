import { CircleDot, Eye, GitCommitHorizontal, GitPullRequest, type LucideIcon } from "lucide-react";
import type { ContributionTotals, RepoActivity } from "@/widgets/github/types";

type ActivityLedgerProps = {
  activity: RepoActivity[];
  totals?: ContributionTotals;
  login?: string;
  newTab?: boolean;
};

const TYPE_TOTALS: { key: keyof ContributionTotals; icon: LucideIcon; label: string }[] = [
  { key: "commits", icon: GitCommitHorizontal, label: "commits" },
  { key: "prs", icon: GitPullRequest, label: "pull requests" },
  { key: "issues", icon: CircleDot, label: "issues" },
  { key: "reviews", icon: Eye, label: "reviews" },
];

export function ActivityLedger({ activity, totals, login, newTab }: ActivityLedgerProps) {
  const max = activity[0]?.total ?? 0;

  return (
    <div className="flex h-full flex-col gap-1.5">
      {totals && (
        <div className="
          text-muted-foreground text-2xs flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1
        ">
          {TYPE_TOTALS.map(({ key, icon: Icon, label }) =>
            totals[key] > 0 ? (
              <span key={key} className="inline-flex items-center gap-1 tabular-nums" title={label}>
                <Icon className="size-3" />
                {totals[key].toLocaleString()}
              </span>
            ) : null,
          )}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto">
        {activity.map((repo) => (
          <RepoRow key={repo.repo} repo={repo} max={max} login={login} newTab={newTab} />
        ))}
      </div>
    </div>
  );
}

function RepoRow({
  repo,
  max,
  login,
  newTab,
}: {
  repo: RepoActivity;
  max: number;
  login?: string;
  newTab?: boolean;
}) {
  const href = login ? `${repo.url}/commits?author=${encodeURIComponent(login)}` : repo.url;
  const width = max > 0 ? Math.max(4, Math.round((repo.total / max) * 100)) : 0;

  return (
    <a
      href={href}
      target={newTab ? "_blank" : undefined}
      rel="noreferrer"
      className="hover:bg-foreground/5 flex flex-col gap-1 rounded-md px-1.5 py-1"
    >
      <div className="flex items-center gap-2">
        <span className="text-foreground min-w-0 flex-1 truncate text-xs">{repo.repo}</span>
        <span className="
          text-muted-foreground text-2xs flex shrink-0 items-center gap-1.5 tabular-nums
        ">
          <Mix icon={GitCommitHorizontal} value={repo.commits} />
          <Mix icon={GitPullRequest} value={repo.prs} />
          <Mix icon={CircleDot} value={repo.issues} />
          <Mix icon={Eye} value={repo.reviews} />
        </span>
        <span className="text-foreground shrink-0 text-xs font-semibold tabular-nums">
          {repo.total.toLocaleString()}
        </span>
      </div>
      <span className="bg-foreground/10 block h-1 w-full overflow-hidden rounded-full">
        <span className="bg-primary block h-full rounded-full" style={{ width: `${width}%` }} />
      </span>
    </a>
  );
}

function Mix({ icon: Icon, value }: { icon: LucideIcon; value: number }) {
  if (value === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      <Icon className="size-3" />
      {value.toLocaleString()}
    </span>
  );
}
